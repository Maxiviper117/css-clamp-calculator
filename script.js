let sizeChart;
let currentSizes = [];

function initChart() {
    const ctx = document.getElementById('sizeChart').getContext('2d');
    sizeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'],
            datasets: [{
                label: 'Size Scale',
                data: [],
                borderColor: '#007bff',
                tension: 0.4,
                pointBackgroundColor: '#007bff',
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Size (rem)'
                    },
                    beginAtZero: true
                },
                x: {
                    display: true,
                    grid: {
                        display: true
                    },
                    ticks: {
                        display: true,
                        padding: 10
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                dragData: {
                    dragY: true,
                    dragX: false,
                    onDragStart: function(e, element) {
                        // Return true to allow dragging
                        return true;
                    },
                    onDrag: function(e, datasetIndex, index, value) {
                        // Ensure value stays positive
                        if (value < 0) return 0;
                        currentSizes[index] = value;
                        generateTailwind();
                    },
                    onDragEnd: function(e, datasetIndex, index, value) {
                        currentSizes[index] = value;
                        generateTailwind();
                    }
                }
            },
            layout: {
                padding: {
                    bottom: 20
                }
            }
        }
    });
    updateChart();
}

function calculateStepSizes(baseSize, numSteps) {
    // If we already have custom sizes from user dragging, use those
    if (currentSizes && currentSizes.length === numSteps) {
        return [...currentSizes];
    }
    
    // Otherwise calculate fresh values using predefined proportions
    const sizes = [];
    
    // Define the standard size multipliers in typography scales
    // These values are commonly used in design systems
    const sizeMultipliers = {
        "xs": 0.6,      // extra small: 60% of base
        "sm": 0.75,     // small: 75% of base
        "md": 0.875,    // medium: 87.5% of base
        "base": 1,      // base: 100%
        "lg": 1.125,    // large: 112.5% of base
        "xl": 1.25,     // extra large: 125% of base
        "2xl": 1.5,     // 2x large: 150% of base
        "3xl": 1.875,   // 3x large: 187.5% of base
        "4xl": 2.25,    // 4x large: 225% of base
        "5xl": 3,       // 5x large: 300% of base
        "6xl": 3.75,    // 6x large: 375% of base
        "7xl": 4.5,     // 7x large: 450% of base
        "8xl": 6,       // 8x large: 600% of base
        "9xl": 8        // 9x large: 800% of base
    };
    
    // Get all size keys and limit to the number of steps requested
    const sizeKeys = Object.keys(sizeMultipliers).slice(0, numSteps);
    
    // Apply standard linear scale
    for (let i = 0; i < sizeKeys.length; i++) {
        const key = sizeKeys[i];
        const baseMultiplier = sizeMultipliers[key];
        const size = baseSize * baseMultiplier;
        sizes.push(size);
    }

    currentSizes = [...sizes];
    return sizes;
}

function updateChart() {
    const baseSize = parseFloat(document.getElementById('baseSize').value);
    const numSteps = Math.max(5, parseInt(document.getElementById('numSteps').value));
    const stepSize = parseFloat(document.getElementById('stepSize').value);
    
    // Adapt to number of steps change while preserving manual adjustments
    if (currentSizes.length !== numSteps) {
        // We need to recalculate, but try to preserve any custom values
        let newSizes = [];
        const oldSizes = [...currentSizes];
        
        if (oldSizes.length > 0) {
            // Keep existing points where possible
            for (let i = 0; i < numSteps; i++) {
                if (i < oldSizes.length) {
                    newSizes.push(oldSizes[i]);
                } else {
                    // Add new points based on the step size
                    newSizes.push(baseSize + (i - 3) * stepSize);
                }
            }
            currentSizes = newSizes;
        } else {
            // First time or reset
            currentSizes = [];
        }
    }
    
    const sizes = calculateStepSizes(baseSize, numSteps);
    
    // Use the same labels we use in the CSS output
    const sizeLabels = ["xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
    
    // Update chart data with all labels
    sizeChart.data.labels = sizeLabels.slice(0, numSteps);
    sizeChart.data.datasets[0].data = sizes;
    sizeChart.update();
    
    // Generate the CSS variables
    generateTailwind();
}

function generateClamp(
    minValue,
    maxValue,
    minViewport,
    maxViewport,
    divider
) {
    const minRem = minViewport / divider;
    const maxRem = maxViewport / divider;
    
    // If minValue and maxValue are the same, we need to adapt them based on viewport
    // so text can scale between viewports
    const effectiveMinValue = minValue;
    const effectiveMaxValue = maxValue * 1.2; // Allow 20% growth at larger viewports
    
    const slope = (effectiveMaxValue - effectiveMinValue) / (maxRem - minRem);
    const intercept = effectiveMinValue - slope * minRem;
    const slopeVw = slope * 100; // Convert to vw units (100 * slope)
    
    return `clamp(${effectiveMinValue.toFixed(3)}rem, calc(${slopeVw.toFixed(3)}vw + ${intercept.toFixed(3)}rem), ${effectiveMaxValue.toFixed(3)}rem)`;
}

function generateTailwind() {
    const minViewport = parseFloat(document.getElementById("minViewport").value);
    const maxViewport = parseFloat(document.getElementById("maxViewport").value);
    const divider = parseFloat(document.getElementById("divider").value);
    const prefix = document.getElementById("prefix").value;
    const baseSize = parseFloat(document.getElementById("baseSize").value);
    const numSteps = Math.max(5, parseInt(document.getElementById("numSteps").value));

    // Get sizes based on current values (either calculated or manually adjusted)
    const sizes = currentSizes.length === numSteps ? [...currentSizes] : calculateStepSizes(baseSize, numSteps);
    let resultText = "<pre><code class='language-css'>:root {";
    
    // Generate labels array for all possible sizes - match the full set we have available
    const sizeLabels = ["xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"];
    
    // Output all sizes in correct order
    for (let i = 0; i < sizes.length; i++) {
        const sizeLabel = sizeLabels[i];
        const clampValue = generateClamp(
            sizes[i],
            sizes[i],
            minViewport,
            maxViewport,
            divider
        );
        resultText += `\n\t--${prefix}-${sizeLabel}: ${clampValue};`;
    }

    resultText += "\n}</code></pre>";
    resultText += `<button class="copy-button" onclick="copyToClipboard()">Copy</button>`;

    document.getElementById("result").innerHTML = resultText;
    hljs.highlightAll();
}

function copyToClipboard() {
    const codeBlock = document.querySelector("#result pre code");
    const tempInput = document.createElement("textarea");
    const selection = window.getSelection();

    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    tempInput.style.top = "0";
    tempInput.value = codeBlock.textContent;
    document.body.appendChild(tempInput);

    selection.removeAllRanges();
    tempInput.select();
    tempInput.setSelectionRange(0, tempInput.value.length);

    try {
        document.execCommand("copy");
    } catch (err) {
        console.error("Failed to copy text: ", err);
    }

    document.body.removeChild(tempInput);
    selection.removeAllRanges();
    alert("Code copied to clipboard!");
}

// Initialize the chart when the page loads
window.addEventListener('load', () => {
    initChart();
    
    // Add event listeners for all input changes
    document.getElementById('baseSize').addEventListener('input', updateChart);
    document.getElementById('numSteps').addEventListener('input', updateChart);
    document.getElementById('stepSize').addEventListener('input', updateChart);
    document.getElementById('minViewport').addEventListener('input', generateTailwind);
    document.getElementById('maxViewport').addEventListener('input', generateTailwind);
    document.getElementById('divider').addEventListener('input', generateTailwind);
    document.getElementById('prefix').addEventListener('input', generateTailwind);
});