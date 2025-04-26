// index.js
import { fetchJSON, renderProjects } from './global.js';

async function initLatestProjects() {
  try {
    const projects = await fetchJSON('./lib/projects.json');
    if (!Array.isArray(projects)) {
      console.error('Expected an array of projects, got:', projects);
      return;
    }

    const latestProjects = projects.slice(0, 3);

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('No element with class "projects" found on the page.');
      return;
    }

    renderProjects(latestProjects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error fetching or rendering latest projects:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLatestProjects);
} else {
  initLatestProjects();
}
