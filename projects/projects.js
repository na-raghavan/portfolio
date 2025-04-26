import { fetchJSON, renderProjects } from '../global.js';

async function initProjects() {
  try {
    const projects = await fetchJSON('../lib/projects.json');

    const projectsTitleElem = document.querySelector('.projects-title');
    if (projectsTitleElem) {
      const baseText = projectsTitleElem.textContent.trim();
      projectsTitleElem.textContent = `${projects.length} projects`;
    }

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Could not find .projects container in the DOM');
      return;
    }
    renderProjects(projects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error loading or rendering projects:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}
