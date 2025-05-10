import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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
    const url = `https://github.com/YOUR_REPO/commit/${id}`;

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
  // basic aggregates
  const totalLOC = data.length;
  const totalCommits = commits.length;

  // files grouping
  const files = d3.groups(data, d => d.file);
  const fileCount = files.length;
  const fileLengths = files.map(([file, rows]) => d3.max(rows, d => d.line));
  const maxFileLength = d3.max(fileLengths);
  const longestFile = files.find(([, rows]) =>
    d3.max(rows, d => d.line) === maxFileLength
  )[0];
  const avgFileLength = d3.mean(fileLengths).toFixed(1);

  // line length & depth
  const avgLineLength = d3.mean(data, d => d.length).toFixed(1);
  const maxLineLength = d3.max(data, d => d.length);
  const longestLine = data.find(d => d.length === maxLineLength);
  const longestLineDesc = `File: ${longestLine.file}, line ${longestLine.line}`;

  const avgDepth = d3.mean(data, d => d.depth).toFixed(1);
  const maxDepth = d3.max(data, d => d.depth);
  const deepestLine = data.find(d => d.depth === maxDepth);
  const deepestLineDesc = `File: ${deepestLine.file}, line ${deepestLine.line}`;

  // average file depth
  const avgFileDepth = d3.mean(
    files.map(([, rows]) => d3.mean(rows, d => d.depth))
  ).toFixed(1);

  // time-of-day
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

  // day-of-week
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
    document.getElementById('commit-link').textContent = commit.id;
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
    // offset a bit so it doesn’t sit directly under the cursor
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top  = `${event.clientY + 10}px`;
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
  
    const svg = d3.select('#chart')
      .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
  
    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([usable.left, usable.right])
      .nice();
  
    const yScale = d3.scaleLinear()
      .domain([0, 24])
      .range([usable.bottom, usable.top]);
  
    // Gridlines (horizontal)
    svg.append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usable.left},0)`)
      .call(
        d3.axisLeft(yScale)
          .tickSize(-usable.width)
          .tickFormat('')
      );
  
    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${usable.bottom})`)
      .call(d3.axisBottom(xScale));
  
    // Y axis with time labels
    svg.append('g')
      .attr('transform', `translate(${usable.left},0)`)
      .call(
        d3.axisLeft(yScale)
          .tickFormat(d => String(d % 24).padStart(2, '0') + ':00')
      );
  
    // Dots
    svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(commits)
    .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', 4)
      // add these handlers:
      .on('mouseenter', (event, commit) => {
        renderTooltipContent(commit);
        updateTooltipPosition(event);
        updateTooltipVisibility(true);
      })
      .on('mouseleave', () => {
        updateTooltipVisibility(false);
      });
}

(async function() {
  const data = await loadData();
  const commits = processCommits(data);
  const stats  = computeStats(data, commits);
  renderStats(stats);
  renderScatterPlot(data, commits);
})();


