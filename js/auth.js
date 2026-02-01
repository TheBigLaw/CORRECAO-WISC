// js/auth.js
const AUTH_KEY = "empresa_auth_v1";
const AUTH_USER_KEY = "empresa_auth_user_v1";

// Usuários cadastrados (você pode trocar os textos depois)
const USERS = [
  { id: "1", label: "Usuário 1" },
  { id: "2", label: "Usuário 2" },
  { id: "3", label: "Usuário 3" },
  { id: "4", label: "Usuário 4" },
];

function getUsers() {
  return USERS;
}

function setAuth(userId) {
  sessionStorage.setItem(AUTH_KEY, "true");
  sessionStorage.setItem(AUTH_USER_KEY, userId);
}

function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

function isAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

function getAuthedUser() {
  return sessionStorage.getItem(AUTH_USER_KEY) || "";
}

// Protege páginas (exceto login)
function guardAuth() {
  const path = (location.pathname || "").toLowerCase();
  const isLogin = path.endsWith("/login.html") || path.endsWith("login.html");
  if (!isLogin && !isAuthed()) {
    location.href = "/login.html";
    return false;
  }
  return true;
}

// Botão "Sair"
function logout() {
  clearAuth();
  location.href = "/login.html";
}

// Preenche o select de usuários no login
function hydrateLoginUsers(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = getUsers()
    .map(u => `<option value="${u.id}">${u.label}</option>`)
    .join("");
}

// Login (senha padrão 1234)
function doLogin({ userId, password }) {
  const pwd = String(password || "").trim();
  if (!userId) return { ok: false, message: "Selecione um usuário." };
  if (pwd !== "1234") return { ok: false, message: "Senha inválida." };

  setAuth(userId);
  return { ok: true };
}
