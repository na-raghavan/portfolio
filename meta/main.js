import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const { author, date, time, timezone, datetime } = lines[0];
    const totalLines = lines.length;
    const hourFrac = datetime.getHours() + datetime.getMinutes() / 60;
    const url = `https://github.com/na-raghavan/portfolio/${id}`; 

    const ret = { id, author, date, time, timezone, datetime, hourFrac, totalLines, url };
    Object.defineProperty(ret, 'lines', {
      value: lines,
      enumerable: false,
      writable: false,
      configurable: false
    });
    return ret;
  });
}

function computeStats(data, commits) {
  const totalLOC = data.length;
  const totalCommits = commits.length;
  const files = d3.groups(data, d => d.file);
  const fileCount = files.length;
  const fileLengths = files.map(([file, rows]) => d3.max(rows, d => d.line));
  const maxFileLength = d3.max(fileLengths);
  const longestFile = files.find(([, rows]) =>
    d3.max(rows, d => d.line) === maxFileLength
  )[0];
  const avgFileLength = d3.mean(fileLengths).toFixed(1);
  const avgLineLength = d3.mean(data, d => d.length).toFixed(1);
  const maxLineLength = d3.max(data, d => d.length);
  const longestLine = data.find(d => d.length === maxLineLength);
  const longestLineDesc = `File: ${longestLine.file}, line ${longestLine.line}`;

  const avgDepth = d3.mean(data, d => d.depth).toFixed(1);
  const maxDepth = d3.max(data, d => d.depth);
  const deepestLine = data.find(d => d.depth === maxDepth);
  const deepestLineDesc = `File: ${deepestLine.file}, line ${deepestLine.line}`;

  const avgFileDepth = d3.mean(
    files.map(([, rows]) => d3.mean(rows, d => d.depth))
  ).toFixed(1);

  const periodOfDay = d => {
    const h = d.datetime.getHours();
    if (h < 6) return 'Night';
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  };
  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    periodOfDay
  );
  const busiestPeriod = d3.greatest(workByPeriod, v => v[1])[0];

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const workByDay = d3.rollups(
    data,
    v => v.length,
    d => dayNames[d.datetime.getDay()]
  );
  const busiestDay = d3.greatest(workByDay, v => v[1])[0];

  return [
    { label: 'Total LOC', value: totalLOC },
    { label: 'Total commits', value: totalCommits },
    { label: 'Number of files', value: fileCount },
    { label: 'Longest file (lines)', value: `${longestFile} (${maxFileLength})` },
    { label: 'Average file length', value: avgFileLength },
    { label: 'Average line length', value: avgLineLength },
    { label: 'Longest line', value: longestLineDesc },
    { label: 'Average depth', value: avgDepth },
    { label: 'Deepest line', value: deepestLineDesc },
    { label: 'Average file depth', value: avgFileDepth },
    { label: 'Busiest time of day', value: busiestPeriod },
    { label: 'Busiest day of week', value: busiestDay },
  ];
}

function renderStats(stats) {
  const container = d3.select('#stats');
  const table = container.append('table').attr('class', 'stats-table');
  const thead = table.append('thead');
  thead.append('tr')
    .selectAll('th')
    .data(['Stat', 'Value'])
    .join('th')
    .text(d => d);

  const tbody = table.append('tbody');
  const rows = tbody.selectAll('tr')
    .data(stats)
    .join('tr');

  rows.append('td').text(d => d.label);
  rows.append('td').text(d => d.value);
}

function renderTooltipContent(commit) {
    document.getElementById('commit-link').href        = commit.url;
    document.getElementById('commit-link').textContent = commit.id.substring(0, 7); // Show short commit hash
    document.getElementById('commit-date').textContent = commit.datetime.toLocaleDateString('en', { dateStyle: 'full' });
    document.getElementById('commit-time').textContent = commit.datetime.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('commit-author').textContent = commit.author;
    document.getElementById('commit-lines').textContent  = commit.totalLines;
  }

  function updateTooltipVisibility(isVisible) {
    document.getElementById('commit-tooltip').hidden = !isVisible;
  }

  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top  = `${event.clientY + 10}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection || !xScale || !yScale) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

(async function() {
  const data = await loadData();
  const commits = processCommits(data);
  const stats  = computeStats(data, commits);

  renderStats(stats);

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];

    const countElement = document.querySelector('#selection-count');
     if (countElement) { // Safely check if element exists
        countElement.textContent = `${
        selectedCommits.length || 'No'
        } commits selected`;
     } else {
        console.error('#selection-count element not found');
     }


    return selectedCommits; // Return selected commits for other functions
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = renderSelectionCount(selection);

    const container = document.getElementById('language-breakdown');
     if (!container) { // Safely check if container exists
         console.error('#language-breakdown element not found');
         return;
     }


    if (selectedCommits.length === 0) {
      container.innerHTML = ''; // Clear breakdown if no commits selected
      return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
      lines,
      (v) => v.length, // count the number of items (lines) in each group
      (d) => d.type,   // group by the line type (language)
    );

    container.innerHTML = ''; // Clear previous breakdown

    const sortedBreakdown = Array.from(breakdown).sort((a, b) => d3.descending(a[1], b[1]));

    for (const [language, count] of sortedBreakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion); // Format as percentage

      container.innerHTML += `
          <dt>${language}</dt>
          <dd>${count} lines (${formatted})</dd>
      `;
    }
  }

  function brushed(event) {
    const selection = event.selection; // The brush selection bounds [[x0, y0], [x1, y1]]
    d3.selectAll('.dots circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );

    renderLanguageBreakdown(selection);

    if (event.type === 'end' && !selection) {
         d3.select('#selection-count').textContent = 'No commits selected';
         d3.select('#language-breakdown').innerHTML = '';
    }
  }

  function renderScatterPlot(data, commits) {
      const width  = 1000;
      const height = 600;
      const margin = { top: 10, right: 10, bottom: 30, left: 40 };
      const usable = {
        left:   margin.left,
        right:  width - margin.right,
        top:    margin.top,
        bottom: height - margin.bottom,
        width:  width - margin.left - margin.right,
        height: height - margin.top  - margin.bottom
      };

      const sorted = commits.slice().sort((a, b) => d3.descending(a.totalLines, b.totalLines));

      const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
      const rScale = d3.scaleSqrt()               // sqrt scale for proportional area
        .domain([minLines, maxLines])
        .range([2, 30]);                           // tweak these min/max radii as you like

      const svg = d3.select('#chart')
        .append('svg')
          .attr('viewBox', `0 0 ${width} ${height}`)
          .style('overflow', 'visible');

      // Assign to global scales here
      xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usable.left, usable.right])
        .nice();

      yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usable.bottom, usable.top]);

      svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usable.left},0)`)
        .call(
          d3.axisLeft(yScale)
            .tickSize(-usable.width)
            .tickFormat('')
        );

      // X-axis
      svg.append('g')
        .attr('class', 'axis x-axis') // Added class
        .attr('transform', `translate(0,${usable.bottom})`)
        .call(d3.axisBottom(xScale));

      // Y-axis
      svg.append('g')
        .attr('class', 'axis y-axis') // Added class
        .attr('transform', `translate(${usable.left},0)`)
        .call(
          d3.axisLeft(yScale)
            .tickFormat(d => String(d % 24).padStart(2,'0') + ':00')
        );

      // Dots
      svg.append('g')
        .attr('class', 'dots') // Keep this class
        .selectAll('circle')
        .data(sorted)
        .join('circle')
          .attr('cx', d => xScale(d.datetime))
          .attr('cy', d => yScale(d.hourFrac))
          .attr('r',  d => rScale(d.totalLines))
          .style('fill-opacity', 0.7) // Use style for opacity
          .on('mouseenter', (event, commit) => {
              if (!event.view.__brushing) {
                  d3.select(event.currentTarget).style('fill-opacity', 1);
                  renderTooltipContent(commit);
                  updateTooltipPosition(event);
                  updateTooltipVisibility(true);
              }
          })
          .on('mouseleave', (event) => {
              if (!event.view.__brushing) {
                 d3.select(event.currentTarget).style('fill-opacity', 0.7);
                 updateTooltipVisibility(false);
              }
          });

      const brush = d3.brush()
         .extent([[usable.left, usable.top], [usable.right, usable.bottom]]) // Limit brush to plotting area
         .on('start brush end', brushed); // Attach the brush event handler

      svg.append("g") // Create a new group for the brush
         .attr("class", "brush") // Add a class for potential styling/selection
         .call(brush);

      svg.selectAll('.dots, .gridlines, .axis').raise();

  } 
  renderScatterPlot(data, commits);

})(); // End async IIFE