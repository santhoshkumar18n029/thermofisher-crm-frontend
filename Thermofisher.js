// Thermofisher CRM - login page script
// Served as a plain <script src="script.js"> (no type="module"), so no import/export here.


// const BASE_URL = "https://thermofisher-crm-backend.onrender.com";
const BASE_URL = "http://localhost:8080";


document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("loginButton");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  loginButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    

    if (!username || !password) {
      alert("Please enter both username and password.");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // required: LoginController stores auth in the HTTP session
        body: JSON.stringify({ username, password }),
      });

      // Your LoginController returns plain text, not JSON - read it as text.
      const message = await res.text();

      if (!res.ok) {

  if (res.status === 401) {
    throw new Error("Please check your username and password.");
  }

  if (res.status === 403) {
    throw new Error("You are not authorized to log in.");
  }

  throw new Error("Login failed. Please try again.");
}
      console.log("Sending:", JSON.stringify({ username, password }));

      // No token to store - session cookie (JSESSIONID) already handles auth
      // on every future fetch() as long as credentials: 'include' is set.
      // Stash the username just so home.html can display who's logged in.
      sessionStorage.setItem("username", username);

      window.location.href = "home.html";

  } catch (err) {

  if (err instanceof TypeError) {
    alert("Unable to connect to the server. Please try again.");
  } else {
    alert(err.message);
  }

} finally {
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  });

  // Allow pressing Enter in the password field to submit.
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginButton.click();
  });

});