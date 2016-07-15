//
// Copyright 2015 Stephen Parker
//
// Licensed under Version 3 of the GPL or any later version
//

/* global d3, data, variantCount */

'use strict';

var hg19References = [
	{name: '1', offset: 0, length: 249250621},
	{name: '2', offset: 249250621, length: 243199373},
	{name: '3', offset: 492449994, length: 198022430},
	{name: '4', offset: 690472424, length: 191154276},
	{name: '5', offset: 881626700, length: 180915260},
	{name: '6', offset: 1062541960, length: 171115067},
	{name: '7', offset: 1233657027, length: 159138663},
	{name: '8', offset: 1392795690, length: 146364022},
	{name: '9', offset: 1539159712, length: 141213431},
	{name: '10', offset: 1680373143, length: 135534747},
	{name: '11', offset: 1815907890, length: 135006516},
	{name: '12', offset: 1950914406, length: 133851895},
	{name: '13', offset: 2084766301, length: 115169878},
	{name: '14', offset: 2199936179, length: 107349540},
	{name: '15', offset: 2307285719, length: 102531392},
	{name: '16', offset: 2409817111, length: 90354753},
	{name: '17', offset: 2500171864, length: 81195210},
	{name: '18', offset: 2581367074, length: 78077248},
	{name: '19', offset: 2659444322, length: 59128983},
	{name: '20', offset: 2718573305, length: 63025520},
	{name: '21', offset: 2781598825, length: 48129895},
	{name: '22', offset: 2829728720, length: 51304566}
];

var hg19ReferenceByName = {};
var hg19ref;
for (hg19ref of hg19References) {
    hg19ReferenceByName[hg19ref.name] = hg19ref;
}

var hg19ReferenceByPosition = {};
for (hg19ref of hg19References) {
    hg19ReferenceByPosition[hg19ref.offset] = hg19ref;
}

var chromatinColors = {
    'active_tss': {'fill': '#ff0000', 'stroke': '#ff0000'},
    'weak_tss': {'fill': '#ff4500', 'stroke': '#ff4500'},
    'flanking_tss': {'fill': '#ff4500', 'stroke': '#ff4500'},
    'strong_transcription': {'fill': '#008000', 'stroke': '#008000'},
    'weak_transcription': {'fill': '#006400', 'stroke': '#006400'},
    'genic_enhancer': {'fill': '#c2e105', 'stroke': '#c2e105'},
    'active_enhancer_1': {'fill': '#ffc34d', 'stroke': '#ffc34d'},
    'active_enhancer_2': {'fill': '#ffc34d', 'stroke': '#ffc34d'},
    'weak_enhancer': {'fill': '#ffff00', 'stroke': '#ffff00'},
    'bivalent_poised_tss': {'fill': '#cd5c5c', 'stroke': '#cd5c5c'},
    'repressed_polycomb': {'fill': '#808080', 'stroke': '#808080'},
    'weak_repressed_polycomb': {'fill': '#c0c0c0', 'stroke': '#c0c0c0'},
    'quiescent_or_low_signal': {'fill': '#ffffff', 'stroke':  '#555'}
};

var eQTLChromatinStateEnrichment = {
    'active_tss': 1.021,
    'weak_tss': 0.819,
    'flanking_tss': 1.088,
    'strong_transcription': 0.653,
    'weak_transcription': 0.310,
    'genic_enhancer': 1.090,
    'active_enhancer_1': 0.427,
    'active_enhancer_2': 0.409,
    'weak_enhancer': 0.436,
    'bivalent_poised_tss': 0.003,
    'repressed_polycomb': -0.211,
    'weak_repressed_polycomb': -0.183,
    'quiescent_or_low_signal': -0.141
};

var eQTLChromatinStateEnrichmentScaled = {
    'active_tss': 0.937,
    'weak_tss': 0.751,
    'flanking_tss': 0.998,
    'strong_transcription': 0.599,
    'weak_transcription': 0.284,
    'genic_enhancer': 1.000,
    'active_enhancer_1': 0.391,
    'active_enhancer_2': 0.375,
    'weak_enhancer': 0.400,
    'bivalent_poised_tss': 0.003,
    'repressed_polycomb': -0.194,
    'weak_repressed_polycomb': -0.168,
    'quiescent_or_low_signal': -0.129
};

var footprints = ['yes', 'no'];

var biotypes = ['lincRNA', 'protein_coding'];

var margin = {top: 10, right: 10, bottom: 60, left: 70};
var plot;
var width;
var height;

var xValue;
var xMap;
var xRange;
var xScale;
var xAxis;
var yValue;
var yMap;
var yRange;
var yScale;
var yAxis;

var zoom;
var tip;
var svg;
var objects;

var biotypeFilterList;
var chromatinStateFilterList;
var footprintFilterList;
var iesiFilterList;

var iesiRange = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var filters = {
    click: {
        chromatinStateFilters: [],
        footprintFilters: [],
        biotypeFilters: [],
        iesiFilters: []
    },
    hover: {
        chromatinStateFilters: [],
        footprintFilters: [],
        biotypeFilters: [],
        iesiFilters: []
    }
};

var geneQuery = null;

var consoleEnabled = false;
var variantDetails = {};

var gburlbase = 'http://genome.ucsc.edu/cgi-bin/hgTracks?hgS_doOtherUser=submit&hgS_otherUserName=arushiv&hgS_otherUserSessionName=2016_07_15_islet_eQTL&position=chr';

function log(msg) {
    if (consoleEnabled) {
        console.log(msg);
    }
}

function report(evt) {
    var addr;
    var link = evt.currentTarget;
    addr = link.innerText.replace('at', '@').split(/\s/);
    link.href = ['m', 'a', 'i', 'l', 't', 'o', ':'].concat(addr).concat('?subject=Islet%20eQTL%20explorer').join('');
}

function makeReporters() {
    var reporter;
    for (reporter of querySelectorAll('.reporter')) {
        reporter.addEventListener('click', report);
    }
}

var format_number_for_locale = window.Intl ? new Intl.NumberFormat(window.navigator.languages || [window.navigator.language || window.navigator.userLanguage], { localeMatcher: 'best fit', maximumFractionDigits: 4 }).format : function(n) {return n;};

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        if (this.nextSibling) this.parentNode.appendChild(this);
    });
};

function fillColor(d) {
    var cs = typeof(d) === 'string' ? d : d.cs;
    return chromatinColors[cs].fill;
}

function strokeColor(d) {
    var cs = typeof(d) === 'string' ? d : d.cs;
    return chromatinColors[cs].stroke;
}

function getShape(o) {
    var fp = (typeof(o) === 'object') ? o.fp : o;
    var shape = fp === 'yes' ? 'square' : 'circle';
    return shape;
}

var drawing = false;

function querySelectorAll(selectors, elementOrId) {
    var container;
    selectors = typeof(selectors) == 'string' ? [selectors] : selectors;
    if (elementOrId) {
        container = typeof(elementOrId) == 'string' ? document.getElementById(elementOrId) : elementOrId;
    } else {
        container = document;
    }
    var result = selectors.map(function(selector) {return Array.from(container.querySelectorAll(selector));}).reduce(function(p, c, i, a) {return p.concat(c);}, []);
    return result;
}

function changeClassList(selector, classesToAdd, classesToRemove) {
    var elements = querySelectorAll(selector);
    elements.map(function(el) {
        var classList = el.classList;
        if (classesToAdd.length > 0) {
            classList.add.apply(classList, classesToAdd);
        }
        if (classesToRemove.length > 0) {
            classList.remove.apply(classList, classesToRemove);
        }
    });
    return elements.length;
}

function getWidth(el) {
    var width = el.offsetWidth;
    var style = window.getComputedStyle(el);
    width = width - parseInt(style.paddingLeft) - parseInt(style.paddingRight);
    return width;
}

function getHeight(el) {
    var height = el.offsetHeight;
    var style = window.getComputedStyle(el);
    height = height - parseInt(style.paddingTop) - parseInt(style.paddingBottom);
    return height;
}

function filtersExist(filterType) {
    for (var filterSet in filters[filterType]) {
        if (filters[filterType][filterSet].length > 0) {
            return true;
        }
    }
    return false;
}

function shouldFilter() {
    return geneQuery !== null || filtersExist('click') || filtersExist('hover');
}

function matchesFilters(filters, filter) {
    return filters.length > 0 && filters.indexOf(filter) !== -1;
}

function combineArrays(arrays) {
    var combinations = [];
    var filtered = arrays.filter(function(a) {return a.length > 0;}).sort(function(a, b) {return b.length - a.length;});

    if (filtered.length == 1) {
        combinations = filtered[0];
    } else if (filtered.length > 1) {
        combinations = filtered.reduce(function(p, c, i, a) {
            return p.map(function(ps) {
                return c.map(function(cs) {
                    if (Array.isArray(ps)) {
                        return ps.map(function(ps2) {
                            if (Array.isArray(ps2)) {
                                return ps2.map(function(ps3) {
                                    return ps3 + cs;
                                });
                            } else {
                                return ps2 + cs;
                            }
                        });
                    } else {
                        return '.dot' + ps + cs;
                    }
                });
            });
        });
    }
    return combinations.join(',');
}

function filterDots() {
    var dotCount = 0;
    if (shouldFilter()) {
        var dotSelectors = [];

        var biotypeFilters;
        var chromatinStateFilters;
        var footprintFilters;
        var iesiFilters;
        var geneFilters = [];
        var allFilters;

        changeClassList('.dot', ['invisible'], ['highlight']);

        if (geneQuery && geneQuery !== '') {
            geneFilters = ['[data-g*="' + geneQuery.toUpperCase() + '"]', '[data-gn*="' + geneQuery.toUpperCase() + '"]'];
        }

        biotypeFilters = filters.click.biotypeFilters.concat(filters.hover.biotypeFilters).map(function(f) {return '[data-bt=' + f + ']';});
        chromatinStateFilters = filters.click.chromatinStateFilters.concat(filters.hover.chromatinStateFilters).map(function(f) {return '[data-cs=' + f + ']';});
        footprintFilters = filters.click.footprintFilters.concat(filters.hover.footprintFilters).map(function(f) {return '[data-fp=' + f + ']';});
        iesiFilters = filters.click.iesiFilters.concat(filters.hover.iesiFilters).map(function(f) {return '[data-si="' + f + '"]';});
        allFilters = [biotypeFilters, chromatinStateFilters, footprintFilters, iesiFilters, geneFilters];
        dotSelectors = combineArrays(allFilters);

        if (dotSelectors.length > 0) {
            dotCount = changeClassList(dotSelectors, ['highlight'], ['invisible']);
        }
    } else {
        changeClassList('.highlight, .invisible', [], ['invisible', 'highlight']);
        dotCount = variantCount;
    }
    document.getElementById('dotCount').innerHTML = 'ISLET eQTL VARIANTS SHOWN: <span>' + dotCount + '</span>';
}

function addFilter(filters, selector) {
    if (filters.indexOf(selector) == -1) {
        filters.push(selector);
    }
}

function removeFilter(filters, selector) {
    var index;
    while ((index = filters.indexOf(selector)) != -1){
        filters.splice(index, 1);
    }
}

function changeFilters(filters, filteringElement) {
    var filter = filteringElement.dataset ? filteringElement.dataset.filter : null;
    if (filter) {
        if (filters.indexOf(filter) == -1) {
            filteringElement.classList.add('selected');
            addFilter(filters, filter);
        } else {
            filteringElement.classList.remove('selected');
            removeFilter(filters, filter);
        }
        return true;
    }
    return false;
}

function makeDotHighlighter(filters) {
    return function(evt) {
        evt.stopPropagation();
        var filter = evt.currentTarget.dataset.filter;
        addFilter(filters, filter);
        requestAnimationFrame(filterDots);
    };
}

function makeDotHighlightResetter(filters) {
    return function(evt) {
        evt.stopPropagation();
        var filter = evt.currentTarget.dataset.filter;
        removeFilter(filters, filter);
        requestAnimationFrame(filterDots);
    };
}

function handleBiotypeClick(evt) {
    evt.stopPropagation();
    if (changeFilters(filters.click.biotypeFilters, evt.currentTarget)) {
        requestAnimationFrame(filterDots);
    }
}

function handleChromatinStateClick(evt) {
    evt.stopPropagation();
    if (changeFilters(filters.click.chromatinStateFilters, evt.currentTarget)) {
        requestAnimationFrame(filterDots);
    }
}

function handleFootprintClick(evt) {
    evt.stopPropagation();
    if (changeFilters(filters.click.footprintFilters, evt.currentTarget)) {
        requestAnimationFrame(filterDots);
    }
}

function handleIESIClick(evt) {
    evt.stopPropagation();
    if (changeFilters(filters.click.iesiFilters, evt.currentTarget)) {
        requestAnimationFrame(filterDots);
    }
}

function setSearchFilter(s) {
    var changed = false;
    if (!s || s === '' && geneQuery) {
        changed = true;
        geneQuery = null;
    } else if (geneQuery === null || s != geneQuery.source) {
        changed = true;
        geneQuery = s; // new RegExp(s, 'ig');
    }
    if (changed) {
        requestAnimationFrame(filterDots);
    }
}

function handleSearchInput(evt) {
    evt.stopPropagation();
    window.setTimeout(function() {setSearchFilter(evt.target.value);}, 100);
}

function reset() {
    filters.click.biotypeFilters = [];
    filters.click.chromatinStateFilters = [];
    filters.click.footprintFilters = [];
    filters.click.iesiFilters = [];
    geneQuery = null;
    document.getElementById('search').value = '';
    draw();
}

function clearInput(evt) {
    evt.preventDefault();
    var input = evt.currentTarget.previousElementSibling;
    input.value = '';
    var event = document.createEvent('HTMLEvents');
    event.initEvent('change', true, false);
    input.dispatchEvent(event);
}

function delabel(s) {
    return (typeof(s) === 'string') ? s.replace(/_/g, ' ') : s;
}

function makeEnrichmentBar(cs) {
    var change = eQTLChromatinStateEnrichment[cs];
    var scaledChange = eQTLChromatinStateEnrichmentScaled[cs];
    var x = 4 * (scaledChange < 0 ? (1 + scaledChange) : 1);
    var width = Math.abs(scaledChange) * 4;
    var height = '1.25em';
    var y = '0.1em';
    var textX = change < 0 ? '0.5em' : '5.5em';
    var content = '<div class="enrichment">' +
        '<svg>' +
        '<rect y="' + y + '" height="' + height + '" x="' + x + 'em" width="' + width + 'em" fill="#ddd" stroke="#999" stroke-width="0.2px"/>' +
        '<line x1="4em" x2="4em" y1="0.1em" y2="1.35em" stroke="#777" stroke-width="1px"/>' +
        '<rect x="0.1em" y="0.1em" height="1.25em" width="8em" stroke-width="0.5px" stroke="#000" fill="transparent"/>' +
        '<text x="' + textX + '" y="1.05em">' + change + '</text>' +
        '<text x="3.75em" y="1.05em">0</text>' +
        '</svg></div>';
    return content;
}

function makeChromatinStateContent(cs) {
    return '<span class="filterColor"><svg><rect x="0.1em" y="0.1em" width="1em" height="1em" fill="' + fillColor(cs) + '" stroke="' + strokeColor(cs) + '" stroke-width="0.5px"/></svg></span><span class="label">' + delabel(cs) + '</span>';
}

var footPrintContent = {
    'yes': '<span class="filterColor"><svg class="rotate45"><rect x="0.1em" y="0.1em" width="0.85em" height="0.85em" fill="#999"/></svg></span>yes',
    'no': '<span class="filterColor"><svg><circle cx="0.5em" cy="0.5em" r="0.5em" fill="#999"/></svg></span>no'
};

function makeFootprintContent(o) {
    var fp = (typeof(o) === 'object') ? o.fp : o;
    return footPrintContent[fp];
}

function placeDot(d) {
    var tx = 'translate(' + xMap(d) + ',' + yMap(d) + ')';
    if (d.fp === 'yes') {
        tx += ' rotate(45)';
    }
    return tx;
}

function makeVariantSortKey(variantID) {
    var chr = Number(variantID.split(':')[0]);
    var pos = Number(variantID.split(':')[1].split('_')[0]);
    var alleles = variantID.split('_')[1];
    return [chr, pos, alleles];
}

function sortVariants(a, b) {
    var i;
    var cmp;
    var k1 = makeVariantSortKey(a);
    var k2 = makeVariantSortKey(b);
    for (i = 0; i < k1.length; i++) {
        cmp = k1[i] - k2[i];
        if (cmp !== 0) {
            break;
        }
    }
    return cmp;
}

function removeVariantDetails(evt) {
    evt.stopPropagation();
    var tr = evt.currentTarget.parentNode.parentNode;
    delete variantDetails[tr.firstChild.innerHTML];
    requestAnimationFrame(makeVariantDetailsTable);
}

function makeVariantDetailsTable() {
    var tr;
    var td;
    var remover;

    var tbody = document.getElementById('variantDetailsBody');

    var variants = Object.keys(variantDetails).sort(sortVariants);
    if (variants.length > 0) {
        tbody.innerHTML = '';
        for (var variant of variants) {
            tr = document.createElement('tr');
            for (var field of variantDetails[variant]) {
                td = document.createElement('td');
                td.innerHTML = field;
                tr.appendChild(td);
            }
            td = document.createElement('td');
            remover = document.createElement('button');
            remover.innerHTML = 'Remove';
            remover.addEventListener('click', removeVariantDetails, true);
            td.appendChild(remover);
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
    } else {
        tbody.innerHTML = '<td colspan="9"><span class="instruction">Click on a variant in the plot to show its details here.</span></td>';
    }
}

function addVariantDetails(d, i) {
    d3.event.preventDefault();
    hideTooltip(d, i);
    var gbwindow = d.chr + ':' + (d.pos - 50000) + '-' + (d.pos + 49999);
    var fields = [
        d.snp,
        '<a target="_blank" href="http://www.ensembl.org/id/' + d.g + '">' + d.g + '</a>',
        d.gn,
        '<a target="_blank" href="' + gburlbase + gbwindow + '">' + d.chr + ':' + format_number_for_locale(d.pos) + '</a>',
        delabel(d.bt),
        makeChromatinStateContent(d.cs),
        makeFootprintContent(d),
        d.lp,
        d.a1 + '/' + d.a2
    ];
    variantDetails[d.snp] = fields;
    if (Object.keys(variantDetails).length > 0) {
        requestAnimationFrame(makeVariantDetailsTable);
    }
}

function showTooltip(d, i) {
    var container = document.getElementById('plot');
    var bounds = container.getBoundingClientRect();
    var horizontal = 'e';
    var vertical = 's';
    var offsetTop = -10;
    var offsetLeft = 10;

    var x = d3.event.pageX;
    var y = d3.event.pageY;
    d3.select(d3.event.target).moveToFront();
    d3.event.target.classList.add('opaque');

    if ((bounds.right - x) < 300) {
        horizontal = 'w';
        offsetLeft = 0;
    }
    if ((bounds.bottom - y) < 300) {
        vertical = 'n';
        offsetTop = 0;
    }
    tip.direction(vertical + horizontal);
    tip.offset([offsetTop, offsetLeft]);
    tip.show(d, i);
}

function hideTooltip(d, i) {
    d3.event.target.classList.remove('opaque');
    tip.hide(d, i);
}

function draw() {
    if (drawing) {
        return;
    }
    drawing = true;

    var li;
    plot = document.getElementById('plot');
    plot.innerHTML = '';
    d3.select('.d3-tip').remove();
    document.getElementById('chromatinStateFilterList').innerHTML = '';
    document.getElementById('footprintFilterList').innerHTML = '';
    document.getElementById('biotypeFilterList').innerHTML = '';
    document.getElementById('iesiFilterList').innerHTML = '';

    width = Math.max(getWidth(plot) - margin.left - margin.right);
    var controlHeight = getHeight(document.getElementById('control'));
    height = Math.max(getWidth(plot) * 0.4, controlHeight);

    xValue = function(d) { return d.pos + hg19ReferenceByName[d.chr].offset;};
    xMap = function(d) { return xScale(xValue(d));};
    xRange = [-50000000, hg19References[hg19References.length - 1].offset + hg19References[hg19References.length - 1].length + 50000000];

    xScale = d3.scale.linear()
        .domain(xRange)
        .range([0, width]);

    xAxis = d3.svg.axis()
        .orient('bottom')
        .scale(xScale)
        .tickValues(d3.set(hg19References.map(function(r) {return r.offset;})).values())
        .tickFormat(function(r) {return hg19ReferenceByPosition[r].name;});

    yValue = function(d) { return d.lp;};
    yMap = function(d) { return yScale(yValue(d));};
    yRange = d3.extent([-1, d3.max(data, function(d) { return d.lp; }) + 5]);

    yScale = d3.scale.linear().domain(yRange).range([height, 0]);

    yAxis = d3.svg.axis().orient('left').scale(yScale);

    zoom = d3.behavior.zoom()
        .scaleExtent([1, 32])
        .x(xScale)
        .y(yScale)
        .on('zoom', function() {
            d3.select('.x.axis').call(xAxis);
            d3.select('.y.axis').call(yAxis);
            svg.selectAll('.dot').attr('transform', placeDot);
        });

    tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 10])
        .direction('se')
        .html(
            function(d) {
                return '<div><h3>' + d.snp + '</h3>' +
                    '<table><tbody>' +
                    '<tr><th>Gene</th><td>' + d.g + '</td></tr>' +
                    '<tr><th>Gene name</th><td>' + d.gn + '</td></tr>' +
                    '<tr><th>Position</th><td>' + d.chr + ':' + d.pos + '</td></tr>' +
                    '<tr><th>Biotype</th><td>' + delabel(d.bt) + '</td></tr>' +
                    '<tr><th>Chromatin state</th><td>' + makeChromatinStateContent(d.cs) + '</td></tr>' +
                    '<tr><th>ATAC-seq footprint?</th><td>' + makeFootprintContent(d) + '</td></tr>' +
                    '<tr><th>eQTL -log<sub>10</sub>(p-value)</th><td>' + d.lp + '</td></tr>' +
                    '<tr><th>Allele 1/2</th><td>' + d.a1 + '/' + d.a2 + '</td></tr>' +
                    '<tr><th>Islet expression specificity index</th><td><progress max="10" value="' + d.si + '"></progress> ' + d.si + '</td></tr>' +
                    '<tbody></table></div>';
            }
        );

    document.getElementById('plot').innerHTML = '';

    var totalWidth = width + margin.left + margin.right;
    var totalHeight = height + margin.top + margin.bottom;

    svg = d3.select('#plot').append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight)
        .attr('viewBox', '0 0 ' + totalWidth + ' ' + totalHeight)
        .attr('preserveAspectRatio', 'xMinYMin')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .call(zoom);

    svg.call(tip);

    svg.append('rect')
        .attr('fill', 'rgba(255, 255, 255, 0)')
        .attr('width', width)
        .attr('height', height);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis)
        .append('text')
        .attr('class', 'label')
        .attr('x', width * 0.5)
        .attr('y', 40)
        .style('text-anchor', 'middle')
        .text('Genomic Location');

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis)
        .append('text')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90), translate(0, -20)')
        .attr('x', -1 * height / 2)
        .attr('y', -35)
        .style('text-anchor', 'middle')
        .text('eQTL -log')
        .append('tspan')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90), translate(0, -20)')
        .attr('dy', '.70em')
        .style('font-size', '0.8em')
        .text('10')
        .append('tspan')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90), translate(0, -20)')
        .attr('dy', '-0.70em')
        .style('font-size', '1.2em')
        .style('text-anchor', 'middle')
        .text('(p-value)');

    objects = svg.append('svg')
        .classed('objects', true)
        .attr('width', width)
        .attr('height', height);

    objects.selectAll('.dot')
        .data(data)
        .enter().append('path')
        .attr('d', d3.svg.symbol().type(getShape))
        .attr('class', 'dot')
        .attr('id', function(d) {return d.id;})
        .attr('data-g', function(d) {return d.g;})
        .attr('data-gn', function(d) {return d.gn;})
        .attr('data-cs', function(d) {return d.cs;})
        .attr('data-bt', function(d) {return d.bt;})
        .attr('data-fp', function(d) {return d.fp;})
        .attr('data-si', function(d) {return d.si;})
        .attr('transform', placeDot)
        .style('fill', fillColor)
        .style('stroke', strokeColor)
        .on('mouseover', showTooltip)
        .on('mouseout', hideTooltip)
        .on('touchstart', showTooltip)
        .on('touchmove', hideTooltip)
        .on('click', addVariantDetails)
        .on('touchend', addVariantDetails);

    chromatinStateFilterList = document.getElementById('chromatinStateFilterList');
    li = document.createElement('li');
    li.classList.add('header');
    li.innerHTML = '<span class="filterColor">State</span><span class="enrichment">eQTL log2 fold enrichment</span>';
    chromatinStateFilterList.appendChild(li);

    Object.keys(chromatinColors).map(function(chromatinState) {
        li = document.createElement('li');
        if (matchesFilters(filters.click.chromatinStateFilters, chromatinState)) {
            li.classList.add('selected');
        }
        li.dataset.filter = chromatinState;
        li.innerHTML = makeChromatinStateContent(chromatinState) + makeEnrichmentBar(chromatinState);
        li.addEventListener('mouseover', makeDotHighlighter(filters.hover.chromatinStateFilters), true);
        li.addEventListener('mouseleave', makeDotHighlightResetter(filters.hover.chromatinStateFilters), true);
        li.addEventListener('click', handleChromatinStateClick, true);
        chromatinStateFilterList.appendChild(li);
    });

    footprintFilterList = document.getElementById('footprintFilterList');

    footprints.map(function(footprint) {
        li = document.createElement('li');
        if (matchesFilters(filters.click.footprintFilters, footprint)) {
            li.classList.add('selected');
        }
        li.dataset.filter = footprint;
        li.innerHTML = makeFootprintContent(footprint);
        li.addEventListener('mouseover', makeDotHighlighter(filters.hover.footprintFilters), true);
        li.addEventListener('mouseleave', makeDotHighlightResetter(filters.hover.footprintFilters), true);
        li.addEventListener('click', handleFootprintClick, true);
        footprintFilterList.appendChild(li);
    });

    biotypeFilterList = document.getElementById('biotypeFilterList');

    biotypes.map(function(biotype) {
        li = document.createElement('li');
        if (matchesFilters(filters.click.biotypeFilters, biotype)) {
            li.classList.add('selected');
        }
        li.dataset.filter = biotype;
        li.innerHTML = delabel(biotype);
        li.addEventListener('mouseover', makeDotHighlighter(filters.hover.biotypeFilters), true);
        li.addEventListener('mouseleave', makeDotHighlightResetter(filters.hover.biotypeFilters), true);
        li.addEventListener('click', handleBiotypeClick, true);
        biotypeFilterList.appendChild(li);
    });

    iesiFilterList = document.getElementById('iesiFilterList');

    iesiRange.map(function(iesi) {
        li = document.createElement('li');
        if (matchesFilters(filters.click.iesiFilters, iesi)) {
            li.classList.add('selected');
        }
        li.dataset.filter = iesi;
        li.innerHTML = delabel(iesi);
        li.addEventListener('mouseover', makeDotHighlighter(filters.hover.iesiFilters), true);
        li.addEventListener('mouseleave', makeDotHighlightResetter(filters.hover.iesiFilters), true);
        li.addEventListener('click', handleIESIClick, true);
        iesiFilterList.appendChild(li);
    });

    requestAnimationFrame(filterDots);
    drawing = false;
}

document.getElementById('variantCount').innerHTML = variantCount;
window.addEventListener('resize', function() {requestAnimationFrame(draw);});
window.addEventListener('orientationchange', function() {requestAnimationFrame(draw);});
document.getElementById('search').addEventListener('change', handleSearchInput);
document.getElementById('search').addEventListener('keyup', handleSearchInput);
document.getElementById('reset').addEventListener('click', reset);
for (var clearButton of querySelectorAll('.inputbox .cleaner')) {
    clearButton.addEventListener('click', clearInput, true);
}
document.getElementById('search').value = '';
makeReporters();
d3.shuffle(data);
draw();
