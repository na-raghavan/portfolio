import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function initProjects() {
  try {
    const projects = await fetchJSON('../lib/projects.json');

    // Update the projects title count
    const projectsTitleElem = document.querySelector('.projects-title');
    if (projectsTitleElem) {
      projectsTitleElem.textContent = `${projects.length} projects`;
    }

    const projectsContainer = document.querySelector('.projects');
    if (!projectsContainer) {
      console.error('Could not find .projects container in the DOM');
      return;
    }
    renderProjects(projects, projectsContainer, 'h2');

    // After rendering projects, draw the pie chart with sample data
    drawPieChart([1, 2, 3, 4, 5, 5]);
  } catch (error) {
    console.error('Error loading or rendering projects:', error);
  }
}

function drawPieChart(data) {
  const svg = d3.select('#projects-pie-plot');
  const radius = 50;

  // 1. Create an arc generator
  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // 2. Create a pie generator to compute start/end angles
  const pieGenerator = d3.pie();
  const arcData = pieGenerator(data);

  // 3. Create a color scale
  const color = d3.scaleOrdinal(d3.schemeTableau10);

  // 4. Join data and append paths
  svg
    .selectAll('path')
    .data(arcData)
    .enter()
    .append('path')
    .attr('d', arcGenerator)
    .attr('fill', (d, i) => color(i));
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjects);
} else {
  initProjects();
}