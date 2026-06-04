import json
import boto3
import uuid
import os
import bcrypt
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb       = boto3.resource('dynamodb')
cognito_client = boto3.client('cognito-idp', region_name='us-east-1')

requests_table      = dynamodb.Table(os.environ.get('DYNAMODB_TABLE',       'LeaveRequests'))
employees_table     = dynamodb.Table(os.environ.get('EMPLOYEES_TABLE',      'Employees'))
policies_table      = dynamodb.Table(os.environ.get('POLICIES_TABLE',       'LeavePolicies'))
notifications_table = dynamodb.Table(os.environ.get('NOTIFICATIONS_TABLE',  'Notifications'))

USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', '')
VALID_ROLES  = ['employee', 'manager', 'hr', 'admin']

DEFAULT_POLICY = {
    "vacation": 30, "sick": 10, "remote": 60,
    "personal": 5,  "maternity": 90, "paternity": 15,
}

HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
}

# ── Helpers ────────────────────────────────────────────────────────────────

def respond(status, body):
    return {"statusCode": status, "headers": HEADERS, "body": json.dumps(body, default=str)}

def hash_password(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p, h):
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def get_session_from_claims(event):
    """
    Extract identity from the JWT claims injected by the API Gateway v2
    JWT Authorizer (Cognito).  Returns a dict with employee_id, role, email
    or None if the authorizer context is absent.
    """
    try:
        claims = (
            (event.get("requestContext") or {})
            .get("authorizer", {})
            .get("jwt", {})
            .get("claims", {})
        )
        if not claims:
            return None
        return {
            "employee_id": claims.get("custom:employee_id", ""),
            "role":        claims.get("custom:role", "employee"),
            "email":       claims.get("email", ""),
        }
    except Exception:
        return None

def get_employee(eid):
    return employees_table.get_item(Key={"employee_id": eid}).get("Item")

def get_policy():
    r = policies_table.get_item(Key={"policy_key": "default"})
    return r.get("Item", {}).get("quotas", DEFAULT_POLICY)

def make_balance(policy):
    return {lt: {"total": Decimal(str(q)), "used": Decimal("0")} for lt, q in policy.items()}

def calc_days(start, end):
    try:
        return max(1, (datetime.strptime(end, "%Y-%m-%d") - datetime.strptime(start, "%Y-%m-%d")).days + 1)
    except Exception:
        return 1

def is_privileged(s):    return s and s.get("role") in ("admin", "hr", "manager")
def is_admin_or_hr(s):   return s and s.get("role") in ("admin", "hr")

def get_balance_vals(emp, lt):
    policy = get_policy()
    raw    = (emp.get("leave_balance") or {}).get(lt, {})
    if isinstance(raw, dict):
        return int(raw.get("total", policy.get(lt, 0))), int(raw.get("used", 0))
    return int(policy.get(lt, 0)), 0

def merge_leave_balance_map(emp, leave_type, new_total, new_used):
    lb = emp.get("leave_balance")
    if not isinstance(lb, dict):
        lb = {}
    out = {}
    for k, v in lb.items():
        if k == leave_type:
            continue
        if not isinstance(v, dict):
            continue
        try:
            out[k] = {
                "total": Decimal(str(v.get("total", 0))),
                "used":  Decimal(str(v.get("used",  0))),
            }
        except Exception:
            continue
    out[leave_type] = {"total": Decimal(str(new_total)), "used": Decimal(str(new_used))}
    return out

def create_notification(recipient_id, message, request_id=None):
    item = {
        "notification_id": str(uuid.uuid4()),
        "recipient_id":    recipient_id,
        "message":         message,
        "is_read":         False,
        "created_at":      datetime.utcnow().isoformat(),
    }
    if request_id:
        item["request_id"] = request_id
    try:
        notifications_table.put_item(Item=item)
    except Exception as e:
        print(f"Notification error: {e}")

def validate_password(pw):
    """
    Returns an error string if pw doesn't satisfy the Cognito password policy,
    or None if it's valid.
    Policy (cognito.tf): min 8 chars, at least 1 lowercase, at least 1 digit.
    """
    if len(pw) < 8:
        return "Password must be at least 8 characters."
    if not any(c.islower() for c in pw):
        return "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in pw):
        return "Password must contain at least one number."
    return None

def cognito_create_user(email, password, employee_id, role, name=""):
    """
    Create a Cognito user.  If the user already exists (e.g. DynamoDB was
    wiped but Cognito was not), update their attributes and reset the password
    instead of failing with UsernameExistsException.
    """
    if not USER_POOL_ID:
        return

    attrs = [
        {"Name": "email",              "Value": email},
        {"Name": "email_verified",     "Value": "true"},
        {"Name": "custom:role",        "Value": role},
        {"Name": "custom:employee_id", "Value": employee_id},
        {"Name": "name",               "Value": name},
    ]

    try:
        cognito_client.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            TemporaryPassword=password,
            MessageAction="SUPPRESS",
            UserAttributes=attrs,
        )
    except cognito_client.exceptions.UsernameExistsException:
        # User exists in Cognito but not in DynamoDB (e.g. after a data reset).
        # Update their attributes to match the new record and fall through to
        # set the password below.
        cognito_client.admin_update_user_attributes(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=attrs,
        )

    # Set (or reset) the permanent password in both cases
    cognito_client.admin_set_user_password(
        UserPoolId=USER_POOL_ID,
        Username=email,
        Password=password,
        Permanent=True,
    )

def cognito_update_user_attributes(email, role, employee_id):
    if not USER_POOL_ID:
        return
    try:
        cognito_client.admin_update_user_attributes(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "custom:role",        "Value": role},
                {"Name": "custom:employee_id", "Value": employee_id},
            ]
        )
    except Exception as e:
        print(f"Cognito update error: {e}")

# ── Lambda handler ─────────────────────────────────────────────────────────

def lambda_handler(event, context):
    ctx    = event.get("requestContext") or {}
    method = (
        event.get("httpMethod")
        or (ctx.get("http") or {}).get("method")
        or ""
    ).upper()
    path = event.get("rawPath") or event.get("path") or ""

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    # All auth now comes from Cognito JWT claims injected by API Gateway
    session = get_session_from_claims(event)

    try:
        # ── POST /register ─────────────────────────────────────────────────
        # Public endpoint — no JWT required (user signs up, Cognito account created)
        if path.endswith("/register") and method == "POST":
            name  = (body.get("name")  or "").strip()
            email = (body.get("email") or "").strip().lower()
            pw    =  body.get("password") or ""
            dept  = (body.get("department") or "").strip()
            if not name or not email or not pw:
                return respond(400, {"error": "Name, email and password are required."})
            pw_err = validate_password(pw)
            if pw_err:
                return respond(400, {"error": pw_err})
            if employees_table.query(
                IndexName="email-index",
                KeyConditionExpression=Key("email").eq(email)
            ).get("Items"):
                return respond(409, {"error": "An account with this email already exists."})
            eid = str(uuid.uuid4())
            employees_table.put_item(Item={
                "employee_id":   eid,
                "name":          name,
                "email":         email,
                "password_hash": hash_password(pw),
                "role":          "employee",
                "department":    dept,
                "leave_balance": make_balance(get_policy()),
                "created_at":    datetime.utcnow().isoformat(),
            })
            try:
                cognito_create_user(email, pw, eid, "employee", name)
            except Exception as ce:
                # Rollback the DynamoDB write — a user with no Cognito account
                # cannot log in, so a half-created record is worse than nothing.
                employees_table.delete_item(Key={"employee_id": eid})
                print(f"Cognito register error (rolled back): {ce}")
                return respond(500, {"error": "Account could not be created. Please try again."})
            return respond(200, {
                "message":     "Account created",
                "employee_id": eid,
                "name":        name,
                "email":       email,
                "role":        "employee",
            })

        # ── POST /login ────────────────────────────────────────────────────
        # Public endpoint — validates DynamoDB credentials and returns profile
        # data.  The JWT itself is obtained client-side via cognitoLogin().
        elif path.endswith("/login") and method == "POST":
            email = (body.get("email") or "").strip().lower()
            pw    =  body.get("password") or ""
            if not email or not pw:
                return respond(400, {"error": "Email and password are required."})
            items = employees_table.query(
                IndexName="email-index",
                KeyConditionExpression=Key("email").eq(email)
            ).get("Items", [])
            emp = items[0] if items else None
            if not emp:
                return respond(401, {"error": "Invalid email or password."})
            stored_hash = emp.get("password_hash") or ""
            if not verify_password(pw, stored_hash):
                return respond(401, {"error": "Invalid email or password."})
            return respond(200, {
                "employee_id": emp["employee_id"],
                "name":        emp["name"],
                "email":       emp["email"],
                "role":        emp.get("role", "employee"),
                "department":  emp.get("department", ""),
                "manager_id":  emp.get("manager_id", ""),
            })

        # ── GET /my-requests ───────────────────────────────────────────────
        elif path.endswith("/my-requests") and method == "GET":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})
            r = requests_table.query(
                IndexName="employee_id-index",
                KeyConditionExpression=Key("employee_id").eq(session["employee_id"])
            )
            return respond(200, {"requests": r.get("Items", [])})

        # ── GET /my-balance ────────────────────────────────────────────────
        elif path.endswith("/my-balance") and method == "GET":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})
            emp = get_employee(session["employee_id"])
            if not emp:
                return respond(404, {"error": "Employee not found"})
            policy  = get_policy()
            balance = {}
            for lt, quota in policy.items():
                total, used = get_balance_vals(emp, lt)
                if total == 0:
                    total = int(quota)
                balance[lt] = {"total": total, "used": used, "remaining": total - used}
            return respond(200, {"leave_balance": balance})

        # ── GET /requests ──────────────────────────────────────────────────
        elif path.endswith("/requests") and method == "GET":
            if not is_privileged(session):
                return respond(401, {"error": "Unauthorized"})
            reqs = requests_table.scan().get("Items", [])
            if session.get("role") == "manager":
                reqs = [r for r in reqs if r.get("manager_id") == session["employee_id"]]
            return respond(200, {"requests": reqs})

        # ── POST /submit ───────────────────────────────────────────────────
        elif path.endswith("/submit") and method == "POST":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})
            emp = get_employee(session["employee_id"])
            if not emp:
                return respond(404, {"error": "Employee not found"})
            lt         = body.get("leave_type", "")
            start_date = body.get("start_date", "")
            end_date   = body.get("end_date",   "")
            days_req   = calc_days(start_date, end_date)
            total, used = get_balance_vals(emp, lt)
            if total == 0:
                total = int(get_policy().get(lt, 0))
            remaining        = total - used
            balance_exceeded = days_req > remaining
            item = {
                "request_id":       str(uuid.uuid4()),
                "employee_id":      emp["employee_id"],
                "employee_name":    emp["name"],
                "employee_email":   emp["email"],
                "department":       emp.get("department", ""),
                "manager_id":       emp.get("manager_id", ""),
                "leave_type":       lt,
                "start_date":       start_date,
                "end_date":         end_date,
                "requested_days":   days_req,
                "reason":           body.get("reason", ""),
                "status":           "pending_manager",
                "balance_exceeded": balance_exceeded,
                "remaining_before": remaining,
                "created_at":       datetime.utcnow().isoformat(),
            }
            requests_table.put_item(Item=item)
            manager_id = emp.get("manager_id", "")
            if manager_id:
                mgr = get_employee(manager_id)
                if mgr:
                    msg = (
                        f"New leave request from {emp['name']} "
                        f"({lt}, {start_date} to {end_date}) is awaiting your review."
                    )
                    create_notification(manager_id, msg, item["request_id"])
            return respond(200, {
                "message":          "Request submitted",
                "request_id":       item["request_id"],
                "balance_exceeded": balance_exceeded,
                "remaining_before": remaining,
            })

        # ── PUT /cancel-request ────────────────────────────────────────────
        elif path.endswith("/cancel-request") and method == "PUT":
            if not session or session.get("role") != "employee":
                return respond(401, {"error": "Unauthorized"})
            rid = body.get("request_id")
            req = requests_table.get_item(Key={"request_id": rid}).get("Item") if rid else None
            if not req:
                return respond(404, {"error": "Request not found"})
            if req.get("employee_id") != session["employee_id"]:
                return respond(403, {"error": "Forbidden"})
            if req.get("status") not in ("pending_manager", "pending_hr"):
                return respond(400, {"error": "Only pending requests can be cancelled"})
            requests_table.update_item(
                Key={"request_id": rid},
                UpdateExpression="SET #s = :s, #u = :u",
                ExpressionAttributeNames={"#s": "status", "#u": "updated_at"},
                ExpressionAttributeValues={":s": "cancelled", ":u": datetime.utcnow().isoformat()},
            )
            return respond(200, {"message": "Request cancelled"})

        # ── PUT /manager-review ────────────────────────────────────────────
        elif path.endswith("/manager-review") and method == "PUT":
            if not session or session.get("role") != "manager":
                return respond(401, {"error": "Unauthorized"})
            rid      = body.get("request_id")
            decision = (body.get("decision") or "").lower()
            comment  = (body.get("comment")  or "").strip()
            if decision not in ("approve", "reject"):
                return respond(400, {"error": "decision must be 'approve' or 'reject'"})
            if not comment:
                return respond(400, {"error": "Comment is mandatory"})
            req = requests_table.get_item(Key={"request_id": rid}).get("Item") if rid else None
            if not req:
                return respond(404, {"error": "Request not found"})
            if req.get("status") != "pending_manager":
                return respond(400, {"error": "Request is not pending manager review"})
            new_status = "pending_hr" if decision == "approve" else "rejected_manager"
            requests_table.update_item(
                Key={"request_id": rid},
                UpdateExpression="SET #s = :s, manager_comment = :c, #u = :u",
                ExpressionAttributeNames={"#s": "status", "#u": "updated_at"},
                ExpressionAttributeValues={":s": new_status, ":c": comment,
                                           ":u": datetime.utcnow().isoformat()},
            )
            emp_notify = get_employee(req.get("employee_id", ""))
            if new_status == "rejected_manager":
                if emp_notify:
                    msg = (
                        f"Your leave request ({req.get('leave_type')}, "
                        f"{req.get('start_date')} to {req.get('end_date')}) "
                        f"was rejected by your manager. Comment: {comment}"
                    )
                    create_notification(req["employee_id"], msg, rid)
            else:
                hr_users = [u for u in employees_table.scan().get("Items", []) if u.get("role") == "hr"]
                emp_name = emp_notify["name"] if emp_notify else "An employee"
                hr_msg = (
                    f"Leave request from {emp_name} ({req.get('leave_type')}, "
                    f"{req.get('start_date')} to {req.get('end_date')}) "
                    f"was approved by the manager and is awaiting your review."
                )
                for hr in hr_users:
                    create_notification(hr["employee_id"], hr_msg, rid)
            return respond(200, {"message": "Review submitted", "status": new_status})

        # ── PUT /hr-review ─────────────────────────────────────────────────
        elif path.endswith("/hr-review") and method == "PUT":
            if not session or session.get("role") != "hr":
                return respond(401, {"error": "Unauthorized"})
            rid      = body.get("request_id")
            decision = (body.get("decision") or "").lower()
            comment  = (body.get("comment")  or "").strip()
            if decision not in ("approve", "reject"):
                return respond(400, {"error": "decision must be 'approve' or 'reject'"})
            if not comment:
                return respond(400, {"error": "Comment is mandatory"})
            req = requests_table.get_item(Key={"request_id": rid}).get("Item") if rid else None
            if not req:
                return respond(404, {"error": "Request not found"})
            if req.get("status") != "pending_hr":
                return respond(400, {"error": "Request is not pending HR review"})
            new_status = "approved" if decision == "approve" else "rejected_hr"

            merged_balance = None
            if new_status == "approved":
                emp = get_employee(req["employee_id"])
                if not emp:
                    return respond(404, {"error": "Employee not found for this request"})
                lt = (req.get("leave_type") or "").strip()
                if not lt:
                    return respond(400, {"error": "Request is missing leave_type"})
                days = int(req.get("requested_days", 1))
                tot, usd = get_balance_vals(emp, lt)
                if tot == 0:
                    tot = int(get_policy().get(lt, 0))
                merged_balance = merge_leave_balance_map(emp, lt, tot, usd + days)

            requests_table.update_item(
                Key={"request_id": rid},
                UpdateExpression="SET #s = :s, hr_comment = :c, hr_reviewer = :h, #u = :u",
                ExpressionAttributeNames={"#s": "status", "#u": "updated_at"},
                ExpressionAttributeValues={
                    ":s": new_status, ":c": comment,
                    ":h": session["employee_id"], ":u": datetime.utcnow().isoformat(),
                },
            )
            if merged_balance is not None:
                employees_table.update_item(
                    Key={"employee_id": req["employee_id"]},
                    UpdateExpression="SET leave_balance = :m",
                    ExpressionAttributeValues={":m": merged_balance},
                )
            emp_notify = get_employee(req.get("employee_id", ""))
            if emp_notify:
                if new_status == "approved":
                    msg = (
                        f"Your leave request ({req.get('leave_type')}, "
                        f"{req.get('start_date')} to {req.get('end_date')}) "
                        f"has been APPROVED by HR."
                    )
                else:
                    msg = (
                        f"Your leave request ({req.get('leave_type')}, "
                        f"{req.get('start_date')} to {req.get('end_date')}) "
                        f"has been REJECTED by HR. Comment: {comment}"
                    )
                create_notification(req["employee_id"], msg, rid)
            return respond(200, {"message": "Review submitted", "status": new_status})

        # ── GET /admin/stats ───────────────────────────────────────────────
        elif path.endswith("/admin/stats") and method == "GET":
            if not is_admin_or_hr(session):
                return respond(401, {"error": "Unauthorized"})
            users = employees_table.scan().get("Items", [])
            reqs  = requests_table.scan().get("Items", [])
            def s(st): return len([r for r in reqs if r.get("status") == st])
            return respond(200, {
                "stats": {
                    "total_requests":         len(reqs),
                    "pending_manager":        s("pending_manager"),
                    "pending_hr":             s("pending_hr"),
                    "approved":               s("approved"),
                    "rejected_manager":       s("rejected_manager"),
                    "rejected_hr":            s("rejected_hr"),
                    "cancelled":              s("cancelled"),
                    "balance_exceeded_count": len([r for r in reqs if r.get("balance_exceeded")]),
                    "total_employees":        len([u for u in users if u.get("role") == "employee"]),
                    "total_managers":         len([u for u in users if u.get("role") == "manager"]),
                    "total_hr":               len([u for u in users if u.get("role") == "hr"]),
                },
                # Include the full requests list so the dashboard only needs
                # one API call instead of calling GET /requests separately.
                "requests": reqs,
            })

        # ── GET /leave-policy ──────────────────────────────────────────────
        elif path.endswith("/leave-policy") and method == "GET":
            if not session:
                return respond(401, {"error": "Unauthorized"})
            return respond(200, {"policy": get_policy()})

        # ── PUT /leave-policy ──────────────────────────────────────────────
        elif path.endswith("/leave-policy") and method == "PUT":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})
            quotas = body.get("quotas")
            if not quotas or not isinstance(quotas, dict):
                return respond(400, {"error": "quotas object is required"})
            san = {}
            for k, v in quotas.items():
                try:
                    n = int(float(str(v)))
                    if n < 0:
                        return respond(400, {"error": f"Invalid quota for {k}"})
                    san[k] = n
                except Exception:
                    return respond(400, {"error": f"Invalid quota for {k}"})
            policies_table.put_item(Item={
                "policy_key": "default",
                "quotas":     san,
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": session.get("employee_id", "admin"),
            })
            return respond(200, {"message": "Policy updated", "quotas": san})

        # ── POST /admin/create-user ────────────────────────────────────────
        elif path.endswith("/admin/create-user") and method == "POST":
            if not session or session.get("role") not in ("admin", "hr"):
                return respond(401, {"error": "Unauthorized"})
            name  = (body.get("name")  or "").strip()
            email = (body.get("email") or "").strip().lower()
            pw    =  body.get("password") or ""
            role  = (body.get("role")  or "employee").lower()
            dept  = (body.get("department") or "").strip()
            pos   = (body.get("position")   or "").strip()
            phone = (body.get("phone")      or "").strip()
            mgr   = (body.get("manager_id") or "").strip()
            try:
                sal = Decimal(str(body.get("salary") or 0))
                if sal < 0:
                    return respond(400, {"error": "Salary cannot be negative."})
            except Exception:
                return respond(400, {"error": "Invalid salary value."})
            if not name or not email or not pw:
                return respond(400, {"error": "Name, email and password are required."})
            if role == "admin":
                return respond(400, {"error": "Cannot create additional admin accounts."})
            if role not in VALID_ROLES:
                return respond(400, {"error": f"Role must be one of: {', '.join(VALID_ROLES)}"})
            pw_err = validate_password(pw)
            if pw_err:
                return respond(400, {"error": pw_err})
            if employees_table.query(
                IndexName="email-index",
                KeyConditionExpression=Key("email").eq(email)
            ).get("Items"):
                return respond(409, {"error": "An account with this email already exists."})
            eid = str(uuid.uuid4())
            employees_table.put_item(Item={
                "employee_id":   eid,
                "name":          name,
                "email":         email,
                "password_hash": hash_password(pw),
                "role":          role,
                "department":    dept,
                "position":      pos,
                "phone":         phone,
                "manager_id":    mgr,
                "salary":        sal,
                "leave_balance": make_balance(get_policy()),
                "created_at":    datetime.utcnow().isoformat(),
            })
            try:
                cognito_create_user(email, pw, eid, role, name)
            except Exception as ce:
                # Rollback — a user with no Cognito account cannot log in.
                employees_table.delete_item(Key={"employee_id": eid})
                print(f"Cognito create-user error (rolled back): {ce}")
                return respond(500, {"error": f"User could not be created in the identity provider: {str(ce)}"})
            return respond(200, {
                "message":     "User created successfully",
                "employee_id": eid,
                "name":        name,
                "email":       email,
                "role":        role,
            })

        # ── GET /admin/users ───────────────────────────────────────────────
        elif path.endswith("/admin/users") and method == "GET":
            if not is_privileged(session):
                return respond(401, {"error": "Unauthorized"})
            users = employees_table.scan().get("Items", [])
            for u in users:
                u.pop("password_hash", None)
            if session.get("role") == "manager":
                mgr  = get_employee(session["employee_id"])
                dept = (mgr.get("department", "") if mgr else "").lower()
                users = [u for u in users if (u.get("department", "") or "").lower() == dept]
            return respond(200, {"users": users})

        # ── PUT /admin/update-user ─────────────────────────────────────────
        elif path.endswith("/admin/update-user") and method == "PUT":
            if not session or session.get("role") not in ("admin", "hr"):
                return respond(401, {"error": "Unauthorized"})
            eid = body.get("employee_id")
            if not eid:
                return respond(400, {"error": "employee_id is required"})
            allowed = ["name", "role", "department", "position", "phone", "manager_id"]
            uf = {k: body[k] for k in allowed if k in body}
            if "role" in uf and uf["role"] == "admin":
                return respond(400, {"error": "Cannot assign admin role."})
            if "salary" in body:
                try:
                    sal = Decimal(str(body["salary"] or 0))
                    if sal < 0:
                        return respond(400, {"error": "Salary cannot be negative."})
                    uf["salary"] = sal
                except Exception:
                    return respond(400, {"error": "Invalid salary value."})
            if body.get("password"):
                uf["password_hash"] = hash_password(body["password"])
            if not uf:
                return respond(400, {"error": "No fields to update"})
            # Sync role change to Cognito
            if "role" in uf:
                emp_to_update = get_employee(eid)
                if emp_to_update:
                    cognito_update_user_attributes(
                        emp_to_update["email"], uf["role"], eid
                    )
            parts, names, vals = [], {}, {}
            for i, (k, v) in enumerate(uf.items()):
                names[f"#f{i}"] = k
                vals[f":v{i}"]  = v
                parts.append(f"#f{i} = :v{i}")
            names["#upd"] = "updated_at"
            vals[":u"]    = datetime.utcnow().isoformat()
            parts.append("#upd = :u")
            employees_table.update_item(
                Key={"employee_id": eid},
                UpdateExpression="SET " + ", ".join(parts),
                ExpressionAttributeNames=names,
                ExpressionAttributeValues=vals,
            )
            return respond(200, {"message": "User updated successfully"})

        # ── DELETE /admin/delete-user ──────────────────────────────────────
        elif path.endswith("/admin/delete-user") and method == "DELETE":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})
            eid = body.get("employee_id")
            if not eid:
                return respond(400, {"error": "employee_id is required"})
            # Also remove from Cognito
            emp_to_delete = get_employee(eid)
            if emp_to_delete and USER_POOL_ID:
                try:
                    cognito_client.admin_delete_user(
                        UserPoolId=USER_POOL_ID,
                        Username=emp_to_delete["email"],
                    )
                except Exception as ce:
                    print(f"Cognito delete-user error: {ce}")
            employees_table.delete_item(Key={"employee_id": eid})
            return respond(200, {"message": "User deleted successfully"})

        # ── DELETE /admin/delete-request ───────────────────────────────────
        elif path.endswith("/admin/delete-request") and method == "DELETE":
            if not session or session.get("role") != "admin":
                return respond(401, {"error": "Unauthorized"})
            rid = body.get("request_id")
            if not rid:
                return respond(400, {"error": "request_id is required"})
            requests_table.delete_item(Key={"request_id": rid})
            return respond(200, {"message": "Request deleted successfully"})

        # ── PUT /admin/update-balance ──────────────────────────────────────
        elif path.endswith("/admin/update-balance") and method == "PUT":
            if not is_admin_or_hr(session):
                return respond(401, {"error": "Unauthorized"})
            eid = body.get("employee_id")
            lt  = body.get("leave_type")
            if not eid or not lt:
                return respond(400, {"error": "employee_id and leave_type are required"})
            try:
                total = Decimal(str(body.get("total", 0)))
                used  = Decimal(str(body.get("used",  0)))
            except Exception:
                return respond(400, {"error": "Invalid balance values"})
            emp_bal = get_employee(eid)
            if not emp_bal:
                return respond(404, {"error": "Employee not found"})
            merged = merge_leave_balance_map(emp_bal, lt, total, used)
            employees_table.update_item(
                Key={"employee_id": eid},
                UpdateExpression="SET leave_balance = :m",
                ExpressionAttributeValues={":m": merged},
            )
            return respond(200, {"message": "Balance updated"})

        # ── GET /notifications ─────────────────────────────────────────────
        elif path.endswith("/notifications") and method == "GET":
            if not session:
                return respond(401, {"error": "Unauthorized"})
            result = notifications_table.query(
                IndexName="recipient_id-index",
                KeyConditionExpression=Key("recipient_id").eq(session["employee_id"])
            )
            notifs = sorted(
                result.get("Items", []),
                key=lambda x: x.get("created_at", ""),
                reverse=True,
            )
            unread = len([n for n in notifs if not n.get("is_read")])
            return respond(200, {"notifications": notifs, "unread_count": unread})

        # ── PUT /notifications/read ────────────────────────────────────────
        elif path.endswith("/notifications/read") and method == "PUT":
            if not session:
                return respond(401, {"error": "Unauthorized"})
            nid = body.get("notification_id")
            if not nid:
                return respond(400, {"error": "notification_id is required"})
            notifications_table.update_item(
                Key={"notification_id": nid},
                UpdateExpression="SET is_read = :r",
                ExpressionAttributeValues={":r": True},
            )
            return respond(200, {"message": "Marked as read"})

        else:
            return respond(404, {"error": "Route not found"})

    except Exception as e:
        print("Error:", str(e))
        return respond(500, {"error": str(e)})