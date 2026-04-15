const API_URL = "/api";

function showMessage(msg) {
    document.getElementById("message").innerText = msg;
}

async function login() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
        return showMessage("❌ Remplis tous les champs");
    }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role);
            localStorage.setItem("userName", data.name);

            showMessage("Connexion réussie ✅");

            // Redirect based on role returned from server
            if (data.role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "user.html";
            }
        } else {
            showMessage("❌ " + data.message);
        }

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        showMessage("❌ Erreur serveur. Vérifiez que le serveur est démarré.");
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    window.location.href = "html.html";
}
