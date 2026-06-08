document.addEventListener('DOMContentLoaded', function() {
    const analyticsSection = document.getElementById('analytics-section');
    const timeFilter = document.getElementById('chart-time-filter');
    
    let rawRevenueData = [];
    let rawWoodData = {};
    
    let revenueChart = null;
    let doughnutChart = null;
    let barChart = null;

    // Fetch stats on load
    fetch('/api/dashboard/stats')
        .then(response => response.json())
        .then(data => {
            rawRevenueData = data.revenue_over_time || [];
            rawWoodData = data.wood_distribution || {};
            
            // Only show analytics if there is data
            if (rawRevenueData.length > 0) {
                analyticsSection.classList.remove('hidden');
                updateSummaryCards();
                updateCharts();
            }
        })
        .catch(err => console.error("Error fetching dashboard stats:", err));

    timeFilter.addEventListener('change', () => {
        updateCharts();
    });

    function updateSummaryCards() {
        let totalRevenue = 0;
        let totalCommission = 0;
        
        rawRevenueData.forEach(d => {
            totalRevenue += d.revenue;
            totalCommission += d.commission;
        });

        document.getElementById('stat-total-revenue').innerText = '₹' + totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('stat-total-commission').innerText = '₹' + totalCommission.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        let topWood = '-';
        let maxVal = -1;
        for (const [wood, stats] of Object.entries(rawWoodData)) {
            if (stats.amount > maxVal) {
                maxVal = stats.amount;
                topWood = wood;
            }
        }
        document.getElementById('stat-top-wood').innerText = topWood;
    }

    function groupData(data, period) {
        const grouped = {};
        
        data.forEach(item => {
            const dateObj = new Date(item.date);
            let key = '';
            
            if (period === 'yearly') {
                key = dateObj.getFullYear().toString();
            } else if (period === 'monthly') {
                key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            } else if (period === 'weekly') {
                // simple weekly grouping
                const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
                const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
                key = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
            } else if (period === 'daily') {
                key = item.date;
            }
            
            if (!grouped[key]) {
                grouped[key] = { revenue: 0, commission: 0 };
            }
            grouped[key].revenue += item.revenue;
            grouped[key].commission += item.commission;
        });
        
        return grouped;
    }

    function updateCharts() {
        const period = timeFilter.value;
        const groupedData = groupData(rawRevenueData, period);
        
        const labels = Object.keys(groupedData).sort();
        const revenueValues = labels.map(l => groupedData[l].revenue);
        const commissionValues = labels.map(l => groupedData[l].commission);

        // Update or create Line Chart
        const lineCtx = document.getElementById('revenueLineChart').getContext('2d');
        if (revenueChart) {
            revenueChart.data.labels = labels;
            revenueChart.data.datasets[0].data = revenueValues;
            revenueChart.data.datasets[1].data = commissionValues;
            revenueChart.update();
        } else {
            revenueChart = new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Revenue (₹)',
                            data: revenueValues,
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Commission (₹)',
                            data: commissionValues,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Prepare Wood Distribution Data
        const woodLabels = Object.keys(rawWoodData);
        const woodAmounts = woodLabels.map(l => rawWoodData[l].amount);
        const woodWeights = woodLabels.map(l => rawWoodData[l].weight);
        
        // Dynamic colors
        const colors = [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
            '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1'
        ];

        // Doughnut Chart (Sales Amount)
        const doughnutCtx = document.getElementById('woodDoughnutChart').getContext('2d');
        if (doughnutChart) {
            doughnutChart.data.labels = woodLabels;
            doughnutChart.data.datasets[0].data = woodAmounts;
            doughnutChart.update();
        } else {
            doughnutChart = new Chart(doughnutCtx, {
                type: 'doughnut',
                data: {
                    labels: woodLabels,
                    datasets: [{
                        data: woodAmounts,
                        backgroundColor: colors.slice(0, woodLabels.length),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed !== null) {
                                        label += '₹' + context.parsed.toLocaleString('en-IN');
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Bar Chart (Wood Volume / Gross Weight)
        const barCtx = document.getElementById('woodBarChart').getContext('2d');
        if (barChart) {
            barChart.data.labels = woodLabels;
            barChart.data.datasets[0].data = woodWeights;
            barChart.update();
        } else {
            barChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: woodLabels,
                    datasets: [{
                        label: 'Volume Sold (KG)',
                        data: woodWeights,
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }
});
