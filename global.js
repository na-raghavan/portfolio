// Debug log to confirm script is running
console.log("Navigation script loaded and running!");

// Helper function for selecting multiple elements
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Dynamically determine base path based on environment
// This handles both local and GitHub Pages environments
function getBasePath() {
  // Extract the repository name from pathname if on GitHub Pages
  const pathSegments = location.pathname.split('/');
  if (location.hostname.includes('github.io') && pathSegments.length > 1) {
    return '/' + pathSegments[1] + '/';
  }
  return '/'; // Default for local environment
}

const BASE_PATH = getBasePath();
console.log("Using base path:", BASE_PATH);

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
  
  // More robust current page detection
  const currentPath = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  const linkPath = a.pathname.endsWith('/') ? a.pathname : a.pathname + '/';
  
  // Check if current path contains or equals link path
  const isCurrent = a.host === location.host && 
                   (currentPath === linkPath || 
                    currentPath.endsWith(linkPath) ||
                    linkPath.endsWith(currentPath));
  
  a.classList.toggle("current", isCurrent);
  
  // Set external links to open in new tab
  if (a.host !== location.host) {
    a.target = "_blank";
  }
  
  nav.append(a);
}