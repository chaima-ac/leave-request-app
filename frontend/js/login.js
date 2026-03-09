function login(role) {
    if (role === "employee") {
        window.location.href = "employee.html";
    } else {
        window.location.href = "admin.html";
    }
}