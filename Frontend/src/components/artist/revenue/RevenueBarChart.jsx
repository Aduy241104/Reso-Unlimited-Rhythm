import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatCurrency, formatNumber } from "../../../utils/revenueFormat";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const RevenueBarChart = ({ data = [] }) => {
    const labels = data.map((item) => item.label);
    const revenueValues = data.map((item) => Number(item.artistRevenueAmount) || 0);

    const chartData = {
        labels,
        datasets: [
            {
                label: "Doanh thu",
                data: revenueValues,
                backgroundColor: "rgba(124, 58, 237, 0.88)",
                borderRadius: 8,
                maxBarThickness: 42,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                backgroundColor: "#18181b",
                titleColor: "#ffffff",
                bodyColor: "#ffffff",
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => `Doanh thu: ${formatCurrency(context.raw)}`,
                    afterLabel: (context) => {
                        const item = data[context.dataIndex];

                        return `Stream hợp lệ: ${formatNumber(item?.totalEligibleStreams || 0)}`;
                    },
                },
            },
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: "#71717a",
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "#f1f1f1",
                },
                ticks: {
                    color: "#71717a",
                    font: {
                        size: 11,
                    },
                    callback: (value) => {
                        if (value >= 1000000) return `${value / 1000000}tr`;
                        if (value >= 1000) return `${value / 1000}k`;
                        return value;
                    },
                },
            },
        },
    };

    if (!data.length) {
        return (
            <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50">
                <p className="text-sm text-zinc-500">Chưa có dữ liệu biểu đồ.</p>
            </div>
        );
    }

    return (
        <div className="h-[320px]">
            <Bar data={ chartData } options={ options } />
        </div>
    );
};

export default RevenueBarChart;