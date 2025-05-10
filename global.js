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

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "meta/", title: "Meta" },
  { url: "https://github.com/na-raghavan/", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith("http")) {
    url = BASE_PATH + url;
  }

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

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

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!Array.isArray(projects)) {
    console.error('renderProjects: first argument must be an array of projects');
    return;
  }
  if (!(containerElement instanceof HTMLElement)) {
    console.error('renderProjects: second argument must be a DOM element');
    return;
  }

  const validHeadings = ['h1','h2','h3','h4','h5','h6'];
  if (!validHeadings.includes(headingLevel.toLowerCase())) {
    console.warn(
      `renderProjects: invalid headingLevel "${headingLevel}", falling back to "h2"`
    );
    headingLevel = 'h2';
  }

  containerElement.innerHTML = '';

  if (projects.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'No projects to display.';
    containerElement.appendChild(emptyMsg);
    return;
  }

  projects.forEach(project => {
    const { title = 'Untitled', image = '', description = '', year = '' } = project;

    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${title}</${headingLevel}>
      <img src="${image}" alt="${title}">
      <div class="project-meta">
        <p class="project-description">${description}</p>
        <p class="project-year">${year}</p>
      </div>
    `;
    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  try {
    const data = await fetchJSON(`https://api.github.com/users/${username}`);
    return data;
  } catch (error) {
    console.error('Error fetching GitHub data for', username, error);
  }
}