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
VALID_ROLES    = ['employee', 'manager', 'hr', 'admin']

HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
}

def respond(status, body):
    return {"statusCode": status, "headers": HEADERS, "body": json.dumps(body, default=str)}

def hash_password(password):
    return hashlib.sha256(f"{PASSWORD_SALT}{password}".encode()).hexdigest()

def create_session(employee_id, role, days=30):
    token      = secrets.token_hex(32)
    expires_dt = datetime.utcnow() + timedelta(days=days)
    sessions_table.put_item(Item={
        "token": token, "employee_id": employee_id, "role": role,
        "expires_at": expires_dt.isoformat(), "ttl_epoch": int(expires_dt.timestamp())
    })
    return token

def resolve_session(token):
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

def get_employee(employee_id):
    return employees_table.get_item(Key={"employee_id": employee_id}).get("Item")

def get_auth_header(event):
    headers = event.get("headers") or {}
    auth = headers.get("Authorization") or headers.get("authorization") or ""
    return auth.replace("Bearer ", "").strip()

def is_privileged(session):
    return session and session.get("role") in ("admin", "hr", "manager")

def is_admin_or_hr(session):
    return session and session.get("role") in ("admin", "hr")

def lambda_handler(event, context):
    print("Event:", json.dumps(event))
    method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    path   = event.get("path") or event.get("requestContext", {}).get("http", {}).get("path", "")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    token   = get_auth_header(event)
    session = resolve_session(token) if token else None

    try:
        # POST /register — employee self-registration
        if path.endswith("/register") and method == "POST":
            name, email, password = (body.get("name") or "").strip(), (body.get("email") or "").strip().lower(), body.get("password") or ""
            department = (body.get("department") or "").strip()
            if not name or not email or not password:
                return respond(400, {"error": "Name, email and password are required."})
            if len(password) < 6:
                return respond(400, {"error": "Password must be at least 6 characters."})
            if employees_table.query(IndexName="email-index", KeyConditionExpression=Key("email").eq(email)).get("Items"):
                return respond(409, {"error": "An account with this email already exists."})
            employee_id = str(uuid.uuid4())
            employees_table.put_item(Item={
                "employee_id": employee_id, "name": name, "email": email,
                "password_hash": hash_password(password), "role": "employee",
                "department": department, "created_at": datetime.utcnow().isoformat()
            })
            token = create_session(employee_id, "employee")
            return respond(200, {"message": "Account created", "token": token, "employee_id": employee_id, "name": name, "email": email, "role": "employee"})

        # POST /login
        elif path.endswith("/login") and method == "POST":
            email, password = (body.get("email") or "").strip().lower(), body.get("password") or ""
            if not email or not password:
                return respond(400, {"error": "Email and password are required."})
            items = employees_table.query(IndexName="email-index", KeyConditionExpression=Key("email").eq(email)).get("Items", [])
            if not items or items[0].get("password_hash") != hash_password(password):
                return respond(401, {"error": "Invalid email or password."})
            emp = items[0]
            role = emp.get("role", "employee")
            token = create_session(emp["employee_id"], role)
            return respond(200, {"token": token, "employee_id": emp["employee_id"], "name": emp["name"], "email": emp["email"], "role": role, "department": emp.get("department", "")})

        # POST /admin-login
        elif path.endswith("/admin-login") and method == "POST":
            if body.get("password") != ADMIN_PASSWORD:
                return respond(401, {"error": "Invalid admin password."})
            token = create_session("admin", "admin", days=1)
            return respond(200, {"token": token})

        # GET /my-requests
        elif path.endswith("/my-requests") and method == "GET":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})
            result = requests_table.query(IndexName="employee_id-index", KeyConditionExpression=Key("employee_id").eq(session["employee_id"]))
            return respond(200, {"requests": result.get("Items", [])})

        # GET /requests
        elif path.endswith("/requests") and method == "GET":
            if not is_privileged(session):
                return respond(401, {"error": "Unauthorized"})
            result = requests_table.scan()
            return respond(200, {"requests": result.get("Items", [])})

        # POST /submit
        elif path.endswith("/submit") and method == "POST":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})
            emp = get_employee(session["employee_id"])
            if not emp:
                return respond(404, {"error": "Employee not found"})
            item = {
                "request_id": str(uuid.uuid4()), "employee_id": emp["employee_id"],
                "employee_name": emp["name"], "employee_email": emp["email"],
                "department": emp.get("department", ""),
                "start_date": body.get("start_date", ""), "end_date": body.get("end_date", ""),
                "leave_type": body.get("leave_type", ""), "reason": body.get("reason", ""),
                "status": "pending", "created_at": datetime.utcnow().isoformat()
            }
            requests_table.put_item(Item=item)
            return respond(200, {"message": "Request submitted", "request_id": item["request_id"]})

        # PUT /request-status
        elif path.endswith("/request-status") and method == "PUT":
            if not is_privileged(session):
                return respond(401, {"error": "Unauthorized"})
            request_id = body.get("request_id")
            status = body.get("status", "").lower()
            if status not in ("approved", "rejected"):
                return respond(400, {"error": "Status must be approved or rejected"})
            requests_table.update_item(
                Key={"request_id": request_id},
                UpdateExpression="SET #s = :s, updated_at = :u, comment = :c, reviewed_by = :r",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":s": status, ":u": datetime.utcnow().isoformat(), ":c": body.get("comment", ""), ":r": session.get("employee_id", "admin")}
            )
            return respond(200, {"message": "Status updated"})

        # POST /admin/create-user
        elif path.endswith("/admin/create-user") and method == "POST":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})
            name, email, password = (body.get("name") or "").strip(), (body.get("email") or "").strip().lower(), body.get("password") or ""
            role = (body.get("role") or "employee").lower()
            if not name or not email or not password:
                return respond(400, {"error": "Name, email and password are required."})
            if role not in VALID_ROLES:
                return respond(400, {"error": f"Role must be one of: {', '.join(VALID_ROLES)}"})
            if len(password) < 6:
                return respond(400, {"error": "Password must be at least 6 characters."})
            if employees_table.query(IndexName="email-index", KeyConditionExpression=Key("email").eq(email)).get("Items"):
                return respond(409, {"error": "An account with this email already exists."})
            employee_id = str(uuid.uuid4())
            employees_table.put_item(Item={
                "employee_id": employee_id, "name": name, "email": email,
                "password_hash": hash_password(password), "role": role,
                "department": (body.get("department") or "").strip(),
                "position": (body.get("position") or "").strip(),
                "phone": (body.get("phone") or "").strip(),
                "created_at": datetime.utcnow().isoformat()
            })
            return respond(200, {"message": "User created successfully", "employee_id": employee_id, "name": name, "email": email, "role": role})

        # GET /admin/users
        elif path.endswith("/admin/users") and method == "GET":
            if not is_admin_or_hr(session):
                return respond(401, {"error": "Unauthorized"})
            users = employees_table.scan().get("Items", [])
            for u in users:
                u.pop("password_hash", None)
            return respond(200, {"users": users})

        # PUT /admin/update-user
        elif path.endswith("/admin/update-user") and method == "PUT":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})
            employee_id = body.get("employee_id")
            if not employee_id:
                return respond(400, {"error": "employee_id is required"})
            update_fields = {k: body[k] for k in ["name", "role", "department", "position", "phone"] if k in body}
            if body.get("password"):
                update_fields["password_hash"] = hash_password(body["password"])
            if not update_fields:
                return respond(400, {"error": "No fields to update"})
            expr_parts, expr_names, expr_values = [], {}, {}
            for i, (k, v) in enumerate(update_fields.items()):
                expr_names[f"#f{i}"] = k
                expr_values[f":v{i}"] = v
                expr_parts.append(f"#f{i} = :v{i}")
            expr_names["#upd"] = "updated_at"
            expr_values[":u"] = datetime.utcnow().isoformat()
            expr_parts.append("#upd = :u")
            employees_table.update_item(
                Key={"employee_id": employee_id},
                UpdateExpression="SET " + ", ".join(expr_parts),
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values
            )
            return respond(200, {"message": "User updated successfully"})

        # DELETE /admin/delete-user
        elif path.endswith("/admin/delete-user") and method == "DELETE":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})
            employee_id = body.get("employee_id")
            if not employee_id:
                return respond(400, {"error": "employee_id is required"})
            employees_table.delete_item(Key={"employee_id": employee_id})
            return respond(200, {"message": "User deleted successfully"})

        else:
            return respond(404, {"error": "Route not found"})

    except Exception as e:
        print("Error:", str(e))
        return respond(500, {"error": str(e)})