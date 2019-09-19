const d3 = require('d3');
const { ipcRenderer } = require('electron');

(function() {
    const color_scheme = d3.scaleOrdinal(d3.schemeCategory10);

    let num_features = 0;
    let cross_correlation = null;
    let mutual_info = null;
    let visible_cc = null;

    let text_color = function(scheme, value, threshold=186) {
        const [r, g, b] = scheme(value).slice(4,-1).split(', ').map(c => parseInt(c, 10));
        const x = 0.299*r + 0.587*g + 0.114*b;
        if (x <= threshold) {
            return '#ffffff';
        } else {
            return '#000000';
        }
    };

    let render_mutual_info = function() {
        let section = d3.select('#mutual-info');

        section.classed('phase--hidden', mutual_info.length === 0).html('');

        let nodes = [];
        mutual_info.forEach(function(link) {
            link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
            link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
        });

        let cell_width = 80,
            cell_height = 25,
            margin = 20,
            padding = 5,
            width = cell_width * (nodes.length + 1) + margin + padding,
            height = cell_height * (nodes.length + 1) + margin + padding;

        let local_scheme = d3.interpolateGnBu;

        let svg = section.append('svg')
            .attr('title', 'Mutual Information')
            .attr('version', 1.1)
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('width', width)
            .attr('height', height)
            .attr('font-family', 'sans-serif');

        let sources = svg.append('g')
            .attr('font-size', 12)
            .attr('transform', function() {
                let x = margin, y = margin + cell_height + padding;
                return 'translate(' + x + ',' + y + ')';
            });

        sources.selectAll('rect')
            .data(mutual_info)
            .enter().append('rect')
            .attr('y', (d) => cell_height * d.source.name)
            .attr('width', cell_width)
            .attr('height', cell_height)
            .attr('fill', (d) => color_scheme(d.source.name))
            .attr('stroke', 'black');

        sources.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('fill', '#000000')
            .attr('dy', '-0.5em')
            .attr('text-anchor', 'end')
            .text('Source');

        let targets = svg.append('g')
            .attr('font-size', 12)
            .attr('transform', function() {
                let x = margin + cell_width + padding, y = margin;
                return 'translate(' + x + ',' + y + ')';
            });

        targets.selectAll('rect')
            .data(mutual_info)
            .enter().append('rect')
            .attr('x', (d) => cell_width * d.target.name)
            .attr('width', cell_width)
            .attr('height', cell_height)
            .attr('fill', (d) => color_scheme(d.target.name))
            .attr('stroke', 'black');

        targets.append('text')
            .attr('fill', '#000000')
            .attr('dy', '-0.5em')
            .text('Target');

        let cells = svg.append('g')
            .attr('font-size', 12)
            .attr('transform', function() {
                let x = margin + cell_width + padding,
                    y = margin + cell_height + padding;
                return 'translate(' + x + ',' + y + ')';
            });

        let onclick = function(d) {
            if (visible_cc) {
                let { source, target } = visible_cc;
                cells.select(`#mi-${source}-${target}`).classed('cell--selected', false);
                cells.select(`#mi-text-${source}-${target}`).classed('text--selected', false);
                if (d.source.name === source && d.target.name === target) {
                    visible_cc = null;
                } else {
                    source = d.source.name;
                    target = d.target.name;
                    visible_cc = { source, target };
                    cells.select(`#mi-${source}-${target}`).classed('cell--selected', true);
                    cells.select(`#mi-text-${source}-${target}`).classed('text--selected', true);
                }
            } else {
                const source = d.source.name;
                const target = d.target.name;
                visible_cc = { source, target };
                cells.select(`#mi-${source}-${target}`).classed('cell--selected', true);
                cells.select(`#mi-text-${source}-${target}`).classed('text--selected', true);
            }
            render_correlation();
        };

        cells.selectAll('rect')
            .data(mutual_info)
            .enter().append('rect')
            .attr('class', 'mi-cell')
            .attr('id', (d) => 'mi-' + d.source.name + '-' + d.target.name)
            .attr('x', (d) => cell_width * d.target.name)
            .attr('y', (d) => cell_height * d.source.name)
            .attr('width', cell_width)
            .attr('height', cell_height)
            .attr('fill', (d) => local_scheme(Number(d.sig.p < 0.05)))
            .attr('stroke', 'black')
            .on('click', onclick)
            .append('title')
            .text((d) => `p = ${d.sig.p.toFixed(3)}`);

        cells.selectAll('text')
            .data(mutual_info)
            .enter().append('text')
            .attr('class', 'mi-cell-text')
            .attr('id', (d) => 'mi-text-' + d.source.name + '-' + d.target.name)
            .attr('x', (d) => cell_width * (d.target.name + 0.5))
            .attr('y', (d) => cell_height * (d.source.name + 0.5))
            .attr('dy', '0.25em')
            .attr('text-anchor', 'middle')
            .attr('fill', (d) => text_color(local_scheme, Number(d.sig.p < 0.05)))
            .text((d) => `${d.y.toFixed(3)} bits`)
            .on('click', onclick)
            .append('title')
            .text((d) => `p = ${d.sig.p.toFixed(3)}`);

        if (visible_cc) {
            const { source, target } = visible_cc;
            if (source >= num_features || target >= num_features) {
                visible_cc = null;
            } else {
                cells.select(`#mi-${source}-${target}`).classed('cell--selected', true);
            }
            render_correlation();
        }
    };

    const render_correlation = function() {
        if (visible_cc) {
            let { source, target } = visible_cc;
            d3.select('#cross-correlation').classed('phase--hidden', false).html('');
            single_curve('#cross-correlation', {
                width: 1024,
                height: 284,
                margins: {top: 20, right: 30, bottom: 30, left: 50},
                title: 'Time-lagged Mutual Information',
                xlabel: 'Temporal Offset',
                ylabel: 'MI (bits)',
            }, cross_correlation[source][target]);
        } else {
            d3.select('#cross-correlation').classed('phase--hidden', true);
        }
    };

    let single_curve = function(container, fmt, data) {
        let svg = d3.select(container).append('svg')
            .attr('title', fmt.title)
            .attr('version', 1.1)
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr('width', fmt.width)
            .attr('height', fmt.height);

        let width = fmt.width - fmt.margins.left - fmt.margins.right,
            height = fmt.height - fmt.margins.top - fmt.margins.bottom;

        let x = d3.scaleLinear().rangeRound([0, width]),
            y = d3.scaleLinear().rangeRound([height, 0]);

        x.domain((fmt.xrange) ? fmt.xrange : d3.extent(data, (d) => d.x));
        y.domain((fmt.yrange) ? fmt.yrange : d3.extent(data, (d) => d.y));

        let line = d3.line()
            .x((d) => x(d.x))
            .y((d) => y(d.y));

        let g = svg.append('g')
            .attr('transform', 'translate(' + fmt.margins.left + ',' + fmt.margins.top + ')');

        g.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .call(d3.axisBottom(x))
            .append('text')
            .attr('fill', '#000000')
            .attr('x', width)
            .attr('y', 7*fmt.margins.bottom/8)
            .attr('text-anchor', 'end')
            .text(fmt.xlabel);

        g.append('g')
            .call(d3.axisLeft(y))
            .append('text')
            .attr('fill', '#000000')
            .attr('transform', 'rotate(-90)')
            .attr('y', -3*fmt.margins.left/4)
            .attr('text-anchor', 'end')
            .text(fmt.ylabel);

        g.append('path').datum(data)
            .attr('fill', 'none')
            .attr('stroke', color_scheme(0))
            .attr('d', line);

        svg.append('text')
            .text(fmt.title)
            .attr('x', fmt.margins.left + width/2)
            .attr('y', fmt.margins.top)
            .attr('dy', '0.71em')
            .attr('text-anchor', 'middle');
    };

    ipcRenderer.on('mutual-info', function(event, data) {
        num_features = 0;

        cross_correlation = data;

        mutual_info = new Array();
        for (let source in cross_correlation) {
            num_features = Math.max(num_features, 1 + parseInt(source));
            for (let target in cross_correlation[source]) {
                const mi = cross_correlation[source][target].find(({ x }) => x == 0);
                mutual_info.push(Object.assign({
                    source: parseInt(source),
                    target: parseInt(target)
                }, mi));
            }
        }

        render_mutual_info();
    });

    return {
        cross_correlation: () => cross_correlation,
        mutual_info: () => mutual_info
    };
}());

