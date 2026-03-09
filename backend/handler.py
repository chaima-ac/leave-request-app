import json
import boto3
import uuid
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
requests_table  = dynamodb.Table(os.environ.get('DYNAMODB_TABLE',  'LeaveRequests'))
employees_table = dynamodb.Table(os.environ.get('EMPLOYEES_TABLE', 'Employees'))
sessions_table  = dynamodb.Table(os.environ.get('SESSIONS_TABLE',  'Sessions'))

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
PASSWORD_SALT  = os.environ.get('PASSWORD_SALT',  'leavedesk_default_salt')

HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
}


# ==================== HELPERS ====================

def respond(status, body):
    return {
        "statusCode": status,
        "headers": HEADERS,
        "body": json.dumps(body, default=str)
    }


def hash_password(password: str) -> str:
    return hashlib.sha256(f"{PASSWORD_SALT}{password}".encode()).hexdigest()


def create_session(employee_id: str, role: str, days: int = 30) -> str:
    token      = secrets.token_hex(32)
    expires_dt = datetime.utcnow() + timedelta(days=days)
    ttl_epoch  = int(expires_dt.timestamp())          # DynamoDB TTL requires Unix epoch int

    sessions_table.put_item(Item={
        "token":       token,
        "employee_id": employee_id,
        "role":        role,
        "expires_at":  expires_dt.isoformat(),        # human-readable, for reference
        "ttl_epoch":   ttl_epoch                       # used by DynamoDB TTL
    })
    return token


def resolve_session(token: str):
    """Returns the session Item if valid, else None."""
    if not token:
        return None
    try:
        res = sessions_table.get_item(Key={"token": token})
        session = res.get("Item")
        if not session:
            return None
        if datetime.utcnow().isoformat() > session.get("expires_at", ""):
            return None
        return session
    except Exception:
        return None


def get_employee(employee_id: str):
    res = employees_table.get_item(Key={"employee_id": employee_id})
    return res.get("Item")


def get_auth_header(event):
    headers = event.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    return auth.replace("Bearer ", "").strip()


# ==================== MAIN HANDLER ====================

def lambda_handler(event, context):
    print("Event:", json.dumps(event))

    method = (
        event.get("httpMethod") or
        event.get("requestContext", {}).get("http", {}).get("method", "")
    )
    path = (
        event.get("path") or
        event.get("requestContext", {}).get("http", {}).get("path", "")
    )

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    token   = get_auth_header(event)
    session = resolve_session(token) if token else None

    try:

        # ── POST /register ───────────────────────────────────────────────
        if path.endswith("/register") and method == "POST":
            name     = (body.get("name") or "").strip()
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            if not name or not email or not password:
                return respond(400, {"error": "Name, email and password are required."})
            if len(password) < 6:
                return respond(400, {"error": "Password must be at least 6 characters."})

            # Duplicate email check
            existing = employees_table.query(
                IndexName="email-index",
                KeyConditionExpression=Key("email").eq(email)
            )
            if existing.get("Items"):
                return respond(409, {"error": "An account with this email already exists."})

            employee_id = str(uuid.uuid4())
            employees_table.put_item(Item={
                "employee_id":   employee_id,
                "name":          name,
                "email":         email,
                "password_hash": hash_password(password),
                "created_at":    datetime.utcnow().isoformat()
            })

            new_token = create_session(employee_id, "employee")
            return respond(200, {
                "message":     "Account created successfully",
                "token":       new_token,
                "employee_id": employee_id,
                "name":        name,
                "email":       email
            })

        # ── POST /login ──────────────────────────────────────────────────
        elif path.endswith("/login") and method == "POST":
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            if not email or not password:
                return respond(400, {"error": "Email and password are required."})

            result = employees_table.query(
                IndexName="email-index",
                KeyConditionExpression=Key("email").eq(email)
            )
            items = result.get("Items", [])

            if not items or items[0].get("password_hash") != hash_password(password):
                return respond(401, {"error": "Invalid email or password."})

            emp       = items[0]
            new_token = create_session(emp["employee_id"], "employee")
            return respond(200, {
                "token":       new_token,
                "employee_id": emp["employee_id"],
                "name":        emp["name"],
                "email":       emp["email"]
            })

        # ── POST /admin-login ────────────────────────────────────────────
        elif path.endswith("/admin-login") and method == "POST":
            if body.get("password") != ADMIN_PASSWORD:
                return respond(401, {"error": "Invalid admin password."})

            new_token = create_session("admin", "admin", days=1)
            return respond(200, {"token": new_token})

        # ── GET /my-requests  (employee — own requests only) ─────────────
        elif path.endswith("/my-requests") and method == "GET":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})

            employee_id = session["employee_id"]
            result = requests_table.query(
                IndexName="employee_id-index",
                KeyConditionExpression=Key("employee_id").eq(employee_id)
            )
            return respond(200, result.get("Items", []))

        # ── GET /requests  (admin — all requests) ────────────────────────
        elif path.endswith("/requests") and method == "GET":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})

            result = requests_table.scan()
            return respond(200, result.get("Items", []))

        # ── POST /submit ─────────────────────────────────────────────────
        elif path.endswith("/submit") and method == "POST":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})

            emp = get_employee(session["employee_id"])
            if not emp:
                return respond(404, {"error": "Employee not found"})

            item = {
                "request_id":     str(uuid.uuid4()),
                "employee_id":    emp["employee_id"],
                "employee_name":  emp["name"],
                "employee_email": emp["email"],
                "start_date":     body.get("start_date", ""),
                "end_date":       body.get("end_date", ""),
                "leave_type":     body.get("leave_type", ""),
                "comment":        body.get("comment", ""),
                "status":         "Pending",
                "created_at":     datetime.utcnow().isoformat()
            }
            requests_table.put_item(Item=item)
            return respond(200, {"message": "Request submitted", "request_id": item["request_id"]})

        # ── PUT /request-status  (admin) ─────────────────────────────────
        elif path.endswith("/request-status") and method == "PUT":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})

            request_id = body.get("request_id")
            status     = body.get("status")

            if status not in ("Approved", "Rejected"):
                return respond(400, {"error": "Status must be Approved or Rejected"})

            requests_table.update_item(
                Key={"request_id": request_id},
                UpdateExpression="SET #s = :s, updated_at = :u",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":s": status,
                    ":u": datetime.utcnow().isoformat()
                }
            )
            return respond(200, {"message": "Status updated"})

        else:
            return respond(404, {"error": "Route not found"})

    except Exception as e:
        print("Error:", str(e))
        return respond(500, {"error": str(e)})