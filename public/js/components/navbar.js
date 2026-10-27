// ==============================================================================
// public/js/components/navbar.js
// Barra de Navegación Reactiva con Estado de Autenticación y Efectos de Scroll
// ==============================================================================

import { onAuthStateChange, signOut, getUserRole } from "../core/auth.js";
import { CONFIG } from "../config.js";

export const Navbar = {
  init() {
    const nav = document.querySelector(".custom-navbar");
    if (!nav) return;

    // Efecto de fondo en scroll
    window.addEventListener("scroll", () => {
      if (window.scrollY > 40) {
        nav.classList.add("navbar-scrolled");
      } else {
        nav.classList.remove("navbar-scrolled");
      }
    });

    // Suscribirse a cambios de sesión
    onAuthStateChange(({ user, profile }) => {
      this.renderAuthSection(user, profile);
    });

    // Delegación para botón de cerrar sesión
    document.addEventListener("click", (e) => {
      if (e.target.matches("#btn-logout") || e.target.closest("#btn-logout")) {
        e.preventDefault();
        signOut().then(() => {
          window.location.reload();
        });
      }
    });
  },

  renderAuthSection(user, profile) {
    const authContainer = document.getElementById("nav-auth-container");
    if (!authContainer) return;

    if (!user) {
      authContainer.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <a href="/login.html" class="btn btn-outline-custom btn-sm">Acceder</a>
          <a href="/login.html#registro" class="btn btn-accent-custom btn-sm">Registrarse</a>
        </div>
      `;
      return;
    }

    const role = profile?.role || CONFIG.ROLES.REGISTRADO;
    const name = profile?.full_name || user.email.split("@")[0];
    
    let roleBadge = "";
    let panelLink = "";

    if (role === CONFIG.ROLES.ADMIN) {
      roleBadge = `<span class="badge badge-accent">Admin</span>`;
      panelLink = `<a href="/panel/admin.html" class="dropdown-item py-2">⚡ Panel Administrador</a>`;
    } else if (role === CONFIG.ROLES.OPERADOR) {
      roleBadge = `<span class="badge badge-accent">Operador</span>`;
      panelLink = `<a href="/panel/operador.html" class="dropdown-item py-2">📨 Panel Operador</a>`;
    }

    authContainer.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-profile-custom dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <div class="user-avatar-mini">${name.charAt(0).toUpperCase()}</div>
          <span class="user-name-label d-none d-md-inline">${name}</span>
          ${roleBadge}
        </button>
        <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end custom-dropdown-glass">
          <li class="px-3 py-2 text-muted small border-bottom border-secondary">
            Conectado como:<br><strong>${user.email}</strong>
          </li>
          ${panelLink ? `<li>${panelLink}</li><li><hr class="dropdown-divider"></li>` : ""}
          <li><a href="/#proyectos" class="dropdown-item py-2">📂 Mis Demos & Proyectos</a></li>
          <li><a href="/manual.html" class="dropdown-item py-2">📘 Manual de Marca</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger py-2" id="btn-logout">Cerrar Sesión</button></li>
        </ul>
      </div>
    `;
  }
};
