const API_URL = "/api";

function showMessage(msg) {
    document.getElementById("message").innerText = msg;
}

async function register(e) {
    e.preventDefault();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const role = document.querySelector('input[name="role"]:checked').value;

    if (!name || !email || !password) {
        return showMessage("❌ Remplis tous les champs");
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await res.json();

        if (res.ok) {
            showMessage("✅ Inscription réussie ! Redirection...");
            document.getElementById("registerForm").reset();
            setTimeout(() => {
                window.location.href = "html.html";
            }, 1500);
        } else {
            showMessage("❌ " + data.message);
        }

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        showMessage("❌ Erreur serveur. Vérifiez que le serveur est démarré.");
    }
}

document.getElementById("registerForm").addEventListener("submit", register);
