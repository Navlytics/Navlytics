let clickedObject = null;
let mostClickedBefore = null;
let mostClickedAfter = null;
let heatmapURL = "";
let heatmapData = null;
let grid = [];
const gridSize = 5;
let highlightElement = null;
let highlightElementFrom = null;
let highlightElementTo = null;
let clicksStatistics = {};
let showBotPaths = true;

// Wait for the DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.querySelector('iframe');
    const heatmapCanvas = document.getElementById('heatmap');
    const heatmapCtx = heatmapCanvas.getContext('2d');

    function createHighlight() {
        highlightElement = document.createElement('div');
        highlightElement.className = 'element-highlight';
        document.body.appendChild(highlightElement);
        highlightElementFrom = document.createElement('div');
        highlightElementFrom.className = 'element-highlight-before';
        document.body.appendChild(highlightElementFrom);
        highlightElementTo = document.createElement('div');
        highlightElementTo.className = 'element-highlight-after';
        document.body.appendChild(highlightElementTo);
    }

    function matchUrlPattern(pattern, url) {
        const escapeRegex = (str) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escapeRegex(pattern).replace(/\*/g, '[^/]+');
        const patternSegments = pattern.split('/').length;
        const urlSegments = url.split('/').length;
        if (patternSegments !== urlSegments) {
            return false;
        }
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(url);
    }

    function getMostClickedBefore(heatMapData, clickedObjectData) {
        const previousIDs = clickedObjectData.map(item => item.previousID);
        const before = heatMapData.filter(item => previousIDs.includes(item.id));
        if (before.length === 0) {
            return null;
        }
        const counts = before.reduce((acc, item) => {
            acc[item.id] = (acc[item.id] || 0) + 1;
            return acc;
        }, {});
        counts[null] = previousIDs.filter(id => id === null).length;
        const mostClickedID = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        const mostClicked = before.find(item => item.id === mostClickedID);
        return mostClicked;
    }

    function getMostClickedAfter(heatMapData, clickedObjectData) {
        const nextIDs = clickedObjectData.map(item => item.nextID);
        const after = heatMapData.filter(item => nextIDs.includes(item.id));
        if (after.length === 0) {
            return null;
        }
        const counts = after.reduce((acc, item) => {
            acc[item.id] = (acc[item.id] || 0) + 1;
            return acc;
        }, {});
        const mostClickedID = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        const mostClicked = after.find(item => item.id === mostClickedID);
        return mostClicked;
    }

    function countClicksOnElement(heatMapData) {
        // count the clicks on each element on the heatmapURL
        clicksStatistics = {};
        heatMapData.forEach(item => {
            if (!matchUrlPattern(heatmapURL, item.url)) {
                return;
            }
            const key = `${item.target.id}`;
            clicksStatistics[key] = {
                "tagName": item.target.tagName,
                "id": item.target.id,
                "path": item.target.path,
                "class": item.target.className,
                "clicks": (clicksStatistics[key]?.clicks || 0) + 1
            }
        });
    }


    async function updateInformation(target) {
        const clickedObjectMap = {
            path: getElementPath(target),
            tagName: target.tagName,
            id: target.id,
            className: target.className
        };
        const clickedObjectData = heatmapData.filter(item => {
            return clickedObjectMap.path === item.target.path && clickedObjectMap.id === item.target.id && clickedObjectMap.tagName === item.target.tagName && matchUrlPattern(heatmapURL, item.url);
        });
        const times = clickedObjectData.map(item => item.pathDuration);
        const fastestTime = times.length ? Math.min(...times) : 0;
        const averageTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        const slowestTime = times.length ? Math.max(...times) : 0;
        const clicks = clickedObjectData.length;
        const botClicks = clickedObjectData.filter(item => !isHumanMousePath(item.path)).length;
        mostClickedBefore = getMostClickedBefore(heatmapData, clickedObjectData);
        mostClickedAfter = getMostClickedAfter(heatmapData, clickedObjectData);

        // Update popup content and position
        document.getElementById('path').textContent = clickedObjectMap.path;
        document.getElementById('id').textContent = target.id || '-';
        document.getElementById('class').textContent = target.className || '-';
        document.getElementById('clicks').textContent = `${clicks} (Bot: ${botClicks})`;
        document.getElementById('fastest-time').textContent = (fastestTime / 1000).toFixed(2);
        document.getElementById('average-time').textContent = (averageTime / 1000).toFixed(2);
        document.getElementById('slowest-time').textContent = (slowestTime / 1000).toFixed(2);
        document.getElementById('most-clicked-before').textContent = mostClickedBefore ? `${mostClickedAfter.target.path}` : 'Keine';
        if (mostClickedBefore) {
            document.getElementById('most-clicked-before').classList.add('linked');
        } else {
            document.getElementById('most-clicked-before').classList.remove('linked');
        }
        document.getElementById('most-clicked-before').onclick = function (event) {
            if (!document.getElementById('most-clicked-before').classList.contains('linked')) {
                return;
            }
            clickedObject = mostClickedBefore.target;
            let element = iframe.contentWindow.document.querySelector(getElementPath(mostClickedBefore.target));
            updateInformation(element);
        };
        document.getElementById('most-clicked-after').textContent = mostClickedAfter ? `${mostClickedAfter.target.path}` : 'Keine';
        if (mostClickedAfter) {
            document.getElementById('most-clicked-after').classList.add('linked');
        } else {
            document.getElementById('most-clicked-after').classList.remove('linked');
        }
        document.getElementById('most-clicked-after').onclick = function (event) {
            if (!document.getElementById('most-clicked-after').classList.contains('linked')) {
                return;
            }
            clickedObject = mostClickedAfter.target;
            let element = iframe.contentWindow.document.querySelector(getElementPath(mostClickedAfter.target));
            updateInformation(element);
        };
    }

    function getElementPath(element) {
        let path = [];
        while (element && element.tagName) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
            } else if (element.className) {
                selector += `.${element.className.split(' ').join('.')}`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    // Set the canvas size to match the iframe size
    function resizeCanvas() {
        heatmapCanvas.width = iframe.offsetWidth;
        heatmapCanvas.height = iframe.offsetHeight;
        initGrid();
    }

    // Initialize the grid
    function initGrid() {
        grid = new Array(Math.ceil(heatmapCanvas.width / gridSize))
            .fill()
            .map(() => new Array(Math.ceil(heatmapCanvas.height / gridSize)).fill(0));
    }

    // Call resizeCanvas initially and on window resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Function to disable tracking.js in the iframe
    function disableTracking() {
        iframe.addEventListener('load', () => {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow.disableTracking) {
                iframeWindow.disableTracking();
            }
        });
    }

    // Function to fetch heat-map data
    async function fetchHeatmapData() {
        try {
            const response = await fetch('/heat-map');
            return await response.json();
        } catch (error) {
            console.error('Error fetching heat-map data:', error);
            return [];
        }
    }

    // Function to draw yellow outlined circle for each click
    function drawClicks(x_click, y_click) {
        heatmapCtx.lineWidth = 2;
        heatmapCtx.beginPath();
        heatmapCtx.arc(x_click - scrollX, y_click - scrollY, 10, 0, 2 * Math.PI);
        heatmapCtx.strokeStyle = 'yellow';
        heatmapCtx.stroke();
    }

    // Function to get color based on count
    function getColor(count) {
        if (count === 1) return 'blue';
        if (count === 2) return 'yellow';
        if (count === 3) return 'orange';
        if (count >= 4) return 'red';
        return 'green';
    }

    function drawPath(path, target, previousID, clickPosition, resolution, bot) {
        // Wenn es ein Bot-Pfad ist und Bot-Pfade ausgeblendet sind, zeichne nichts
        if (bot && !showBotPaths) {
            return;
        }

        heatmapCtx.lineWidth = bot ? 3 : 10; // Dünnere Linie für Bots

        // Get previous click position and element
        let startX = 0;
        let startY = 0;

        if (previousID) {
            const previousData = heatmapData.find(d => d.id === previousID);
            if (previousData && previousData.clickPosition && previousData.clickPosition.relativeClickPosition) {
                const previousElement = iframe.contentWindow.document.querySelector(previousData.target.path);
                if (previousElement) {
                    const previousRect = previousElement.getBoundingClientRect();
                    startX = previousRect.left + (previousData.clickPosition.relativeClickPosition.x * previousRect.width);
                    startY = previousRect.top + (previousData.clickPosition.relativeClickPosition.y * previousRect.height);
                }
            } else {
                const scrollX = iframe.contentWindow.scrollX;
                const scrollY = iframe.contentWindow.scrollY;
                const width = document.getElementById('width-max').value;
                const height = document.getElementById('height-max').value;
                startX = width * (path[0].x / resolution.width) - scrollX;
                startY = height * (path[0].y / resolution.height) - scrollY;
            }
        } else {
            const scrollX = iframe.contentWindow.scrollX;
            const scrollY = iframe.contentWindow.scrollY;
            const width = document.getElementById('width-max').value;
            const height = document.getElementById('height-max').value;
            startX = width * (path[0].x / resolution.width) - scrollX;
            startY = height * (path[0].y / resolution.height) - scrollY;
        }

        // Get current target element and click position
        const targetElement = iframe.contentWindow.document.querySelector(target.path);
        if (!targetElement || !clickPosition || !clickPosition.relativeClickPosition) return;

        const targetRect = targetElement.getBoundingClientRect();
        const endX = targetRect.left + (clickPosition.relativeClickPosition.x * targetRect.width);
        const endY = targetRect.top + (clickPosition.relativeClickPosition.y * targetRect.height);

        if (path) {
            heatmapCtx.beginPath();
            heatmapCtx.moveTo(startX, startY);

            path.forEach((point, index) => {
                const x = startX + (point.xr * (endX - startX));
                const y = startY + (point.yr * (endY - startY));

                const gridX = Math.floor(x / gridSize);
                const gridY = Math.floor(y / gridSize);

                if (gridX >= 0 && gridX < grid.length && gridY >= 0 && gridY < grid[0].length) {
                    grid[gridX][gridY]++;
                    let count = grid[gridX][gridY];
                    count = Math.floor(count / 10);

                    if (bot) {
                        heatmapCtx.setLineDash([]);
                        heatmapCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                        heatmapCtx.lineWidth = 10;
                    } else {
                        heatmapCtx.setLineDash([]);
                        heatmapCtx.strokeStyle = getColor(count);
                        heatmapCtx.globalAlpha = 0.3 + count / 10;
                    }
                } else {
                    heatmapCtx.strokeStyle = bot ? 'rgba(0, 0, 0, 0.6)' : 'green';
                    heatmapCtx.globalAlpha = 0.3;
                }

                heatmapCtx.lineTo(x, y);
                heatmapCtx.stroke();
                heatmapCtx.beginPath();
                heatmapCtx.moveTo(x, y);
            });

            // Reset line dash
            heatmapCtx.setLineDash([]);
        }
    }

    function isHumanMousePath(path) {
        if (!Array.isArray(path) || path.length < 3) {
            return false;
        }

        // Prüfe auf lineare Bewegung durch Berechnung der Abweichung von einer perfekten Linie
        function checkLinearity(points) {

            let linearSegments = 0;
            let totalSegments = 0;
            for (let j = 1; j < points.length - 2; j++) {
                // Berechne drei aufeinanderfolgende Steigungen
                const dx1 = points[j].x - points[j - 1].x;
                const dx2 = points[j + 1].x - points[j].x;
                const dx3 = points[j + 2].x - points[j + 1].x;

                if (dx1 === 0 || dx2 === 0 || dx3 === 0) continue;

                const slope1 = (points[j].y - points[j - 1].y) / dx1;
                const slope2 = (points[j + 1].y - points[j].y) / dx2;
                const slope3 = (points[j + 2].y - points[j + 1].y) / dx3;

                // Berechne die Ähnlichkeit der Steigungen
                const maxSlope = Math.max(Math.abs(slope1), Math.abs(slope2), Math.abs(slope3));
                const minSlope = Math.min(Math.abs(slope1), Math.abs(slope2), Math.abs(slope3));

                // Wenn die Steigungen sehr ähnlich sind (nahe 1), ist es verdächtig linear
                const slopeSimilarity = minSlope / (maxSlope || 1);
                if (slopeSimilarity > 0.8) {
                    linearSegments++;
                }
                totalSegments++;
            }
            isLinear = totalSegments > 0 ? linearSegments / totalSegments : 0;

            if (isLinear) {
                linearSegments++;
            }

            return linearSegments / totalSegments;
        }

        // Prüfe auf konstante Zeitintervalle
        function checkTimeConsistency(points) {
            let intervals = [];
            for (let i = 1; i < points.length; i++) {
                const interval = points[i].time - points[i - 1].time;
                if (interval > 0) {
                    intervals.push(interval);
                }
            }

            if (intervals.length < 2) return 1;

            // Berechne Standardabweichung der Intervalle
            const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            return stdDev / avg; // Variationskoeffizient
        }

        // Prüfe auf verdächtig gleichmäßige Bewegung
        function checkMovementRegularity(points) {
            let distances = [];
            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i - 1].x;
                const dy = points[i].y - points[i - 1].y;
                distances.push(Math.sqrt(dx * dx + dy * dy));
            }

            if (distances.length < 2) return 1;

            // Berechne Standardabweichung der Abstände
            const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
            const variance = distances.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / distances.length;
            const stdDev = Math.sqrt(variance);

            return stdDev / avg; // Variationskoeffizient
        }

        const linearityScore = checkLinearity(path);
        const timeVariation = checkTimeConsistency(path);
        const movementVariation = checkMovementRegularity(path);

        // Verschärfte Bot-Kriterien
        const isBot =
            linearityScore > 0.6 ||           // Mehr als 60% linear
            timeVariation < 0.3 ||            // Zu konstante Zeitintervalle
            movementVariation < 0.25 ||       // Zu gleichmäßige Bewegung
            (linearityScore > 0.4 && timeVariation < 0.4); // Kombination aus beiden

        return !isBot;
    }

    // Function to draw the heatmap
    function drawHeatmap(data) {
        heatmapCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
        initGrid();

        data.forEach(item => {
            if (clickedObject === null) {
                return;
            }
            if (clickedObject.path !== item.target.path || clickedObject.id !== item.target.id || clickedObject.tagName !== item.target.tagName || !matchUrlPattern(heatmapURL, item.url)) {
                return;
            }
            const { clickPosition, resolution, path, previousID, target } = item;

            const bot = !isHumanMousePath(path);

            drawPath(path, target, previousID, clickPosition, resolution, bot);

            const element_offset = iframe.contentWindow.document.getElementById(clickedObject.id).getBoundingClientRect();

            const x_click = (clickPosition.relativeClickPosition.x * element_offset.width) + element_offset.left;
            const y_click = (clickPosition.relativeClickPosition.y * element_offset.height) + element_offset.top;

            drawClicks(x_click, y_click);
        });
    }

    async function initHeatmap() {
        heatmapData = await fetchHeatmapData();
    }

    // Main function to initialize the heatmap
    async function updateHeatmap() {
        if (!heatmapData) {
            return;
        }
        drawHeatmap(heatmapData);

        if (!clickedObject) {
            return;
        }
        const iframeRect = iframe.getBoundingClientRect();
        const zoomFactor = parseFloat(iframe.style.zoom) || 1;

        const target = iframe.contentWindow.document.querySelector(getElementPath(clickedObject));
        if (target) {
            const targetRect = target.getBoundingClientRect();
            highlightElement.style.left = `${iframeRect.left + targetRect.left * zoomFactor}px`;
            highlightElement.style.top = `${iframeRect.top + targetRect.top * zoomFactor}px`;
            highlightElement.style.width = `${targetRect.width * zoomFactor}px`;
            highlightElement.style.height = `${targetRect.height * zoomFactor}px`;
        }

        if (mostClickedBefore) {
            // Update highlight position for most clicked before
            const targetBefore = iframe.contentWindow.document.querySelector(getElementPath(mostClickedBefore?.target));
            if (targetBefore) {
                const targetRectBefore = targetBefore.getBoundingClientRect();
                highlightElementFrom.style.left = `${iframeRect.left + targetRectBefore.left * zoomFactor}px`;
                highlightElementFrom.style.top = `${iframeRect.top + targetRectBefore.top * zoomFactor}px`;
                highlightElementFrom.style.width = `${targetRectBefore.width * zoomFactor}px`;
                highlightElementFrom.style.height = `${targetRectBefore.height * zoomFactor}px`;
            }
        } else {
            // remove highlight for most clicked before
            highlightElementFrom.style.left = '-1000px';
            highlightElementFrom.style.top = '-1000px';
            highlightElementFrom.style.width = '0';
            highlightElementFrom.style.height = '0';
        }

        if (mostClickedAfter) {
            // Update highlight position for most clicked after
            const targetAfter = iframe.contentWindow.document.querySelector(getElementPath(mostClickedAfter?.target));
            if (targetAfter) {
                const targetRectAfter = targetAfter.getBoundingClientRect();
                highlightElementTo.style.left = `${iframeRect.left + targetRectAfter.left * zoomFactor}px`;
                highlightElementTo.style.top = `${iframeRect.top + targetRectAfter.top * zoomFactor}px`;
                highlightElementTo.style.width = `${targetRectAfter.width * zoomFactor}px`;
                highlightElementTo.style.height = `${targetRectAfter.height * zoomFactor}px`;
            }
        } else {
            // remove highlight for most clicked after
            highlightElementTo.style.left = '-1000px';
            highlightElementTo.style.top = '-1000px';
            highlightElementTo.style.width = '0';
            highlightElementTo.style.height = '0';
        }
    }

    function getClickedObject(event) {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow.getClickedObject) {
            return iframeWindow.getClickedObject(event);
        }
    }

    //get all elements with the class 'further_information'
    const further_information = document.querySelectorAll('.further_information');
    //hide all elements with the class 'further_information'
    further_information.forEach(info => {
        info.style.display = 'none';
    }
    );
    //get all elements with the class 'card'
    const cards = document.querySelectorAll('.card');
    //add click event listener to each card
    cards.forEach(card => {
        card.addEventListener('click', event => {
            // if clicked on input in the card return
            if (event.target.tagName === 'INPUT') {
                return;
            }
            //get all elements inside the card with the class 'further_information'
            const further_information = card.querySelectorAll('.further_information');
            //toggle the display of the elements
            further_information.forEach(info => {
                if (info.style.display === 'none') {
                    info.style.display = 'block';
                } else {
                    info.style.display = 'none';
                }
            });
            //get the element with the class 'card_information'
            const card_information = card.querySelector('.card_information');
            //toggle the display of the element
            if (card_information.style.display === 'none') {
                card_information.style.display = 'block';
            } else {
                card_information.style.display = 'none';
            }
        });
    });

    // event Listener on iframe url change
    iframe.addEventListener('load', () => {
        const iframeWindow = iframe.contentWindow;
        iframeWindow.document.addEventListener('click', event => {
            const object = getClickedObject(event);
            if (object) {
                clickedObject = object;
                updateInformation(event.target);
            }
        }, true);
        if (iframeWindow.disableTracking) {
            iframeWindow.disableTracking();
        }
        if (iframeWindow.addControlledClicking) {
            iframeWindow.addControlledClicking();
        }
        document.getElementById('iframe_url').value = iframeWindow.location.href.split('?')[0].split('#')[0];
        document.getElementById('iframe_heatmap_url').value = iframeWindow.location.href.split('?')[0].split('#')[0];
        heatmapURL = iframeWindow.location.href.split('?')[0].split('#')[0];
        clearChart();
        countClicksOnElement(heatmapData);
        createBarChart(clicksStatistics);
        checkIframeAccessibility(); // new call
    });

    document.getElementById('iframe_heatmap_url').addEventListener('change', () => {
        heatmapURL = document.getElementById('iframe_heatmap_url').value;
        clearChart();
        countClicksOnElement(heatmapData);
        createBarChart(clicksStatistics);
    });

    document.getElementById('iframe_url').addEventListener('change', () => {
        iframe.src = document.getElementById('iframe_url').value;
    });

    function clearChart() {
        const container = document.getElementById('chart');
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    function createBarChart(data) {
        const container = document.getElementById('chart');
        const maxValue = Math.max(...Object.values(data).map(item => item.clicks));

        sortedData = Object.entries(data).sort((a, b) => b[1].clicks - a[1].clicks);
        sortedData.splice(5);

        sortedData.forEach(([key, value]) => {
            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';

            const bar = document.createElement('div');
            const label = document.createElement('span');
            const popup = document.createElement('div');

            bar.className = 'bar';
            label.className = 'bar-label';
            popup.className = 'popup';

            const percentage = (value.clicks / maxValue) * 100;
            bar.style.width = `${percentage}%`;

            label.textContent = key;

            popup.innerHTML = `
                        <div class="popup-row">
                            <span class="popup-label">Path:</span>
                            <span class="popup-value">${value.path || '-'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label">ID:</span>
                            <span class="popup-value">${value.id || '-'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label">Class:</span>
                            <span class="popup-value">${value.class || '-'}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label">Clicks:</span>
                            <span class="popup-value">${value.clicks}</span>
                        </div>
                    `;

            bar.addEventListener('mouseenter', () => {
                popup.style.display = 'block';
            });

            bar.addEventListener('mouseleave', () => {
                popup.style.display = 'none';
            });

            bar.appendChild(label);
            barContainer.appendChild(bar);
            barContainer.appendChild(popup);
            container.appendChild(barContainer);
        });
    }

    createHighlight();
    initHeatmap();
    setInterval(updateHeatmap, 1);

    const widthMin = document.getElementById('width-min');
    const widthMax = document.getElementById('width-max');
    const heightMin = document.getElementById('height-min');
    const heightMax = document.getElementById('height-max');
    const widthValue = document.getElementById('width-value');
    const heightValue = document.getElementById('height-value');

    function updateSliderRange(minSlider, maxSlider, valueSpan) {
        const min = parseInt(minSlider.value);
        const max = parseInt(maxSlider.value);

        if (min > max) {
            const tmp = max;
            maxSlider.value = min;
            minSlider.value = tmp;
        }

        // Update slider track color
        const parent = minSlider.parentElement;
        const track = parent.querySelector('.slider-track');
        const percent1 = (minSlider.value / minSlider.max) * 100;
        const percent2 = (maxSlider.value / maxSlider.max) * 100;
        track.style.background = `linear-gradient(to right, #ddd ${percent1}%, var(--accent-color) ${percent1}%, var(--accent-color) ${percent2}%, #ddd ${percent2}%)`;

        valueSpan.textContent = `${minSlider.value}px - ${maxSlider.value}px`;
        updateHeatmapForResolution();
    }

    function updateHeatmapForResolution() {
        const widthRange = {
            min: parseInt(widthMin.value),
            max: parseInt(widthMax.value)
        };
        const heightRange = {
            min: parseInt(heightMin.value),
            max: parseInt(heightMax.value)
        };

        fetch(`/heat-map?widthMin=${widthRange.min}&widthMax=${widthRange.max}&heightMin=${heightRange.min}&heightMax=${heightRange.max}`)
            .then(response => response.json())
            .then(data => {
                heatmapData = data;
                if (clickedObject) {
                    updateInformation(iframe.contentWindow.document.querySelector(getElementPath(clickedObject)));
                }
                clearChart();
                countClicksOnElement(data);
                createBarChart(clicksStatistics);
                drawHeatmap(data); // Füge dies hinzu, damit die Heatmap neu gezeichnet wird
            })
            .catch(error => console.error('Fehler beim Laden der Heatmap-Daten:', error));
    }

    function updateIframeSize() {
        const widthMax = document.getElementById('width-max').value;
        const heightMax = document.getElementById('height-max').value;

        const iframe = document.querySelector('iframe');
        const iframeContainer = document.getElementById('uiux-frame');

        // Setze die maximale Größe des iframes
        iframe.style.width = `${widthMax}px`;
        iframe.style.height = `${heightMax}px`;

        // Zentriere das iframe im Container
        iframe.style.position = 'absolute';
        iframe.style.left = '50%';
        iframe.style.top = '50%';

        // Berechne Zoom-Faktor wenn iframe größer als Container
        const containerWidth = iframeContainer.offsetWidth;
        const containerHeight = iframeContainer.offsetHeight;

        if (widthMax > containerWidth || heightMax > containerHeight) {
            const widthRatio = containerWidth / widthMax;
            const heightRatio = containerHeight / heightMax;
            const zoomFactor = Math.min(widthRatio, heightRatio);
            iframe.style.zoom = zoomFactor;
            iframe.style.transform = 'translate(-50%, -50%)';
        } else {
            iframe.style.zoom = 1;
            iframe.style.transform = 'translate(-50%, -50%)';
        }

        // Passe auch die Größe des Heatmap-Canvas an
        const heatmapCanvas = document.getElementById('heatmap');
        heatmapCanvas.width = widthMax;
        heatmapCanvas.height = heightMax;
        heatmapCanvas.style.width = `${widthMax}px`;
        heatmapCanvas.style.height = `${heightMax}px`;
        heatmapCanvas.style.position = 'absolute';
        heatmapCanvas.style.left = '50%';
        heatmapCanvas.style.top = '50%';
        heatmapCanvas.style.zoom = iframe.style.zoom;
        heatmapCanvas.style.transform = iframe.style.transform;
    }

    // Event Listener für die Slider
    widthMin.addEventListener('input', () => {
        updateSliderRange(widthMin, widthMax, widthValue);
    });
    widthMax.addEventListener('input', () => {
        updateSliderRange(widthMin, widthMax, widthValue);
        updateIframeSize();
    });
    heightMin.addEventListener('input', () => {
        updateSliderRange(heightMin, heightMax, heightValue);
    });
    heightMax.addEventListener('input', () => {
        updateSliderRange(heightMin, heightMax, heightValue);
        updateIframeSize();
    });

    // Initiale Aktualisierung
    updateSliderRange(widthMin, widthMax, widthValue);
    updateSliderRange(heightMin, heightMax, heightValue);
    updateIframeSize();

    document.getElementById('show-bots').addEventListener('change', function (e) {
        showBotPaths = e.target.checked;
        drawHeatmap(heatmapData); // Aktualisiere die Heatmap
    });

    // Neue Funktionen: Speichern und Laden von Auflösungen
    async function saveResolution() {
        const width = document.getElementById('width-max').value;
        const height = document.getElementById('height-max').value;
        try {
            await fetch('/save-resolution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ width, height })
            });
            loadSavedResolutions();
        } catch (error) {
            console.error('Error saving resolution:', error);
        }
    }

    async function loadSavedResolutions() {
        try {
            const response = await fetch('/saved-resolutions');
            const resolutions = await response.json();
            const selector = document.getElementById('resolution-selector');
            selector.innerHTML = '';
            resolutions.forEach((res, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${res.width}px x ${res.height}px`;
                selector.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading resolutions:', error);
        }
    }

    // Event Listener für den neuen Button
    document.getElementById('save-resolution-btn').addEventListener('click', saveResolution);

    // Event Listener für den Selector
    document.getElementById('resolution-selector').addEventListener('change', event => {
        // Beim Auswählen: Update der Slider und iFrame Größe
        const selectedOption = event.target.options[event.target.selectedIndex].textContent;
        const [width, height] = selectedOption.split(' x ').map(s => s.replace('px', '').trim());
        document.getElementById('width-max').value = width;
        document.getElementById('height-max').value = height;
        updateSliderRange(document.getElementById('width-min'), document.getElementById('width-max'), document.getElementById('width-value'));
        updateSliderRange(document.getElementById('height-min'), document.getElementById('height-max'), document.getElementById('height-value'));
        updateIframeSize();
    });

    // Initialer Aufruf um gespeicherte Auflösungen zu laden
    loadSavedResolutions();
});

// Check the iframe for missing alt/text attributes
function checkIframeAccessibility() {
    const iframe = document.querySelector('iframe');
    const iframeDoc = iframe.contentWindow.document;
    let issues = [];

    // Process img elements for alt attribute issues
    const imgs = Array.from(iframeDoc.querySelectorAll('img'));
    imgs.forEach(img => {
        if (!img.hasAttribute('alt') || img.getAttribute('alt') === '') {
            if (img.id) {
                issues.push(`Fehler: Fehlender alt-Attribut bei Bild mit id "${img.id}".`);
            } else {
                const identifier = img.src ? img.src : img.outerHTML.slice(0, 60) + '...';
                issues.push(`Fehler: Fehlender alt-Attribut bei Bild. Identifier: ${identifier}`);
            }
        }
    });

    // Check for duplicate alt attribute values in images
    const altCount = {};
    imgs.forEach(img => {
        if (img.hasAttribute('alt')) {
            const alt = img.getAttribute('alt');
            // Ignoriere leere Werte, da diese schon als Fehler markiert werden
            if (alt && alt.trim() !== '') {
                altCount[alt] = (altCount[alt] || 0) + 1;
            }
        }
    });
    Object.keys(altCount).forEach(altValue => {
        if (altCount[altValue] > 1) {
            issues.push(`Fehler: Dupliziertes alt-Attribut "${altValue}" erscheint ${altCount[altValue]} mal.`);
        }
    });

    // Process svg elements for title attribute issues
    const svgs = Array.from(iframeDoc.querySelectorAll('svg'));
    svgs.forEach(svg => {
        if (!svg.getAttribute('title')) {
            if (svg.id) {
                issues.push(`Fehler: Fehlendes title-Attribut bei SVG mit id "${svg.id}".`);
            } else {
                issues.push(`Fehler: Fehlendes title-Attribut bei SVG.`);
            }
        }
    });

    // Check for duplicate title attribute values in SVGs
    const titleCount = {};
    svgs.forEach(svg => {
        const title = svg.getAttribute('title');
        if (title && title.trim() !== '') {
            titleCount[title] = (titleCount[title] || 0) + 1;
        }
    });
    Object.keys(titleCount).forEach(titleValue => {
        if (titleCount[titleValue] > 1) {
            issues.push(`Fehler: Dupliziertes title-Attribut "${titleValue}" erscheint ${titleCount[titleValue]} mal.`);
        }
    });

    const list = document.getElementById('accessibility-issues');
    list.innerHTML = issues.length ? issues.map(i => `<li>${i}</li>`).join('') : '<li>Keine Probleme gefunden</li>';
}