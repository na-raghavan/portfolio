function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

function getBasePath() {
  const segments = location.pathname.split('/');
  if (location.hostname.includes('github.io') && segments.length > 1) {
    return '/' + segments[1] + '/';
  }
  return '/';
}
const BASE_PATH = getBasePath();

// Define pages in your navigation
let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "https://github.com/na-raghavan/", title: "GitHub" },
];

// Create navigation element
let nav = document.createElement("nav");
document.body.prepend(nav);

// Create navigation links
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Debug log for path comparison
  console.log(`Comparing - Link: ${a.pathname}, Current: ${location.pathname}`);

  const currentPath = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  const linkPath = a.pathname.endsWith('/') ? a.pathname : a.pathname + '/';

  const isCurrent = a.host === location.host &&
    (currentPath === linkPath ||
      currentPath.endsWith(linkPath) ||
      linkPath.endsWith(currentPath));

  a.classList.toggle("current", isCurrent);

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

document.body.insertAdjacentHTML('afterbegin', `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`);


const select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty("color-scheme", colorScheme);
}

if ("colorScheme" in localStorage) {
  const savedScheme = localStorage.colorScheme;
  setColorScheme(savedScheme);
  select.value = savedScheme;
}

select.addEventListener("input", (event) => {
  const scheme = event.target.value;
  setColorScheme(scheme);
  localStorage.colorScheme = scheme;
});

const form = document.querySelector("form[action^='mailto:']");

form?.addEventListener("submit", (event) => {
  event.preventDefault(); 

  const data = new FormData(form);
  const params = [];

  for (let [name, value] of data) {
    const encoded = encodeURIComponent(value);
    params.push(`${name}=${encoded}`);
  }

  const query = params.join("&");
  const action = form.getAttribute("action");
  const url = `${action}?${query}`;

  console.log("Opening mailto URL:", url);
  location.href = url;
});
