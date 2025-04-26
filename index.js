import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function initLatestProjects() {
  try {
    const projects = await fetchJSON('./lib/projects.json');
    if (!Array.isArray(projects)) {
      console.error('Expected array of projects, got:', projects);
      return;
    }
    const latestProjects = projects.slice(0, 3);
    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('No element with class "projects" found.');
      return;
    }
    renderProjects(latestProjects, projectsContainer, 'h2');
  } catch (error) {
    console.error('Error fetching or rendering latest projects:', error);
  }
}

async function initProfileStats() {
  try {
    const githubData = await fetchGitHubData('na-raghavan');
    if (!githubData) return;

    const profileStats = document.querySelector('#profile-stats');
    if (!profileStats) {
      console.error('No element with id "profile-stats" found.');
      return;
    }

    profileStats.innerHTML = `
      <dl>
        <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
        <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
        <dt>Followers:</dt><dd>${githubData.followers}</dd>
        <dt>Following:</dt><dd>${githubData.following}</dd>
      </dl>
    `;
  } catch (error) {
    console.error('Error fetching or rendering GitHub profile stats:', error);
  }
}

async function initHomepage() {
  await initLatestProjects();
  await initProfileStats();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomepage);
} else {
  initHomepage();
}
