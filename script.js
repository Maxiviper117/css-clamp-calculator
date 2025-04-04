let sizeChart;

function initChart() {
    const ctx = document.getElementById('sizeChart').getContext('2d');
    sizeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl'],
            datasets: [{
                label: 'Size Scale',
                data: [],
                borderColor: '#007bff',
                tension: 0.4
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
                }
            },
            layout: {
                padding: {
                    bottom: 20  // Add padding at the bottom for x-axis labels
                }
            }
        }
    });
    updateChart();
}

function calculateStepSizes(baseSize, numSteps) {
    const curveType = document.getElementById('curveType').value;
    const intensity = parseFloat(document.getElementById('curveIntensity').value);
    const sizes = [];
    const smallerSteps = 3; // xs, sm, md
    const largerSteps = numSteps - 4; // excluding base

    // Calculate smaller sizes
    for (let i = smallerSteps; i > 0; i--) {
        let step;
        switch (curveType) {
            case 'exponential':
                step = baseSize - (Math.pow(i / smallerSteps, intensity) * (baseSize * 0.4));
                break;
            case 'logarithmic':
                step = baseSize - (Math.log(i + 1) / Math.log(smallerSteps + 1) * (baseSize * 0.4));
                break;
            default: // linear
                step = baseSize - ((i / smallerSteps) * (baseSize * 0.4));
        }
        sizes.push(step);
    }

    // Add base size
    sizes.push(baseSize);

    // Calculate larger sizes
    for (let i = 1; i <= largerSteps; i++) {
        let step;
        switch (curveType) {
            case 'exponential':
                step = baseSize + (Math.pow(i / largerSteps, intensity) * (baseSize * 0.8));
                break;
            case 'logarithmic':
                step = baseSize + (Math.log(i + 1) / Math.log(largerSteps + 1) * (baseSize * 0.8));
                break;
            default: // linear
                step = baseSize + ((i / largerSteps) * (baseSize * 0.8));
        }
        sizes.push(step);
    }

    return sizes;
}

function updateChart() {
    const baseSize = parseFloat(document.getElementById('baseSize').value);
    const numSteps = Math.max(5, parseInt(document.getElementById('numSteps').value));
    const sizes = calculateStepSizes(baseSize, numSteps);
    
    // Update chart data
    sizeChart.data.labels = ['xs', 'sm', 'md', 'base', 'lg', 'xl', '2xl', '3xl'].slice(0, numSteps);
    sizeChart.data.datasets[0].data = sizes;
    sizeChart.update();
    
    // Update step size based on curve
    document.getElementById('stepSize').value = (sizes[sizes.length - 1] - sizes[0]) / (sizes.length - 1);
    
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

    // Calculate sizes based on the curve
    const sizes = calculateStepSizes(baseSize, numSteps);
    let resultText = "<pre><code class='language-css'>:root {";
    
    // Output smaller sizes in specific order (xs, sm, md)
    const smallerLabels = ["xs", "sm", "md"];
    for (let i = 0; i < smallerLabels.length; i++) {
        const sizeLabel = smallerLabels[i];
        const clampValue = generateClamp(
            sizes[i],
            sizes[i],
            minViewport,
            maxViewport,
            divider
        );
        resultText += `\n\t--${prefix}-${sizeLabel}: ${clampValue};`;
    }

    // Add base size
    const baseClamp = generateClamp(
        sizes[3],
        sizes[3],
        minViewport,
        maxViewport,
        divider
    );
    resultText += `\n\t--${prefix}-base: ${baseClamp};`;

    // Output larger sizes
    const largerLabels = ["lg", "xl", "2xl", "3xl", "4xl", "5xl"];
    for (let i = 4; i < sizes.length; i++) {
        const sizeLabel = largerLabels[i - 4];
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
    
    // Add event listeners for input changes
    document.getElementById('baseSize').addEventListener('input', updateChart);
    document.getElementById('numSteps').addEventListener('input', updateChart);
    document.getElementById('curveType').addEventListener('change', updateChart);
    document.getElementById('curveIntensity').addEventListener('input', updateChart);
});