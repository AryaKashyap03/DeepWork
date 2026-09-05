import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from 'axios'

import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const Dashboard = () => {

    const { user, accessToken } = useAuth();
    const [showTaskOptions, setShowTaskOptions] = useState(false);
    const navigate = useNavigate();

    const[tasks, setTasks] = useState([])
    const [selectedPeriod, setSelectedPeriod] = useState("THIS_WEEK");
    const[tasklist, setTaskList] = useState(null)


    // AI Integration
    const [aiInsight, setAiInsight] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();

    const fetchAIInsight = async () => {
            setAiLoading(true);
            setAiError("");

            try {
                const response = await axios.post(
                    "http://localhost:8000/ai/insight",
                    {
                        period: selectedPeriod
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        },
                        signal: controller.signal
                    }
                );

                setAiInsight(response.data);

            } catch (error) {

                // Ignore requests cancelled because the user
                // changed the selected period.
                if (error.name === "CanceledError" ||
                    error.name === "AbortError") {
                    return;
                }

                console.error("AI insight error:", error);
                setAiError(
                    "Unable to generate an AI insight right now."
                );

            } finally {

                if (!controller.signal.aborted) {
                    setAiLoading(false);
                }
            }
        };

        fetchAIInsight();

        // Cancel the previous AI request whenever the period
        // changes or the component unmounts.
        return () => {
            controller.abort();
        };

    }, [accessToken, selectedPeriod]);


    const getDeadlineTime = (deadline) => {

        if (!deadline) {
            return 0;
        }

        if (
            !deadline.endsWith("Z") &&
            !deadline.includes("+") &&
            !deadline.includes("-", 10)
        ) {
            deadline = `${deadline}Z`;
        }

        return new Date(deadline).getTime();

    };


    const formatDeadline = (deadline) => {

        const date = new Date(getDeadlineTime(deadline));

        if (isNaN(date.getTime())) {
            return "Invalid date";
        }

        return date.toLocaleString([], {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

    };

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await axios.get("http://localhost:8000/tasks", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    withCredentials: true
                });

                setTasks(response.data);
            } catch (err) {
                console.error("Failed to fetch tasks:", err);
            }
        };

        if (accessToken) {
            fetchTasks();
        }
    }, [accessToken]);

    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();

        // Monday = start of week
        const diff = day === 0 ? -6 : 1 - day;

        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);

        return d;
    };

    const getEndOfWeek = (date) => {
        const start = getStartOfWeek(date);

        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        end.setMilliseconds(-1);

        return end;
    };

    const getPeriodTasks = () => {
        const now = new Date();

        if (selectedPeriod === "ALL_TIME") {
            return tasks;
        }

        if (selectedPeriod === "THIS_MONTH") {
            const start = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

            return tasks.filter(task => {
                const taskDate = new Date(task.created_at);
                return taskDate >= start && taskDate <= now;
            });
        }

        const currentWeekStart = getStartOfWeek(now);

        if (selectedPeriod === "THIS_WEEK") {
            const currentWeekEnd = getEndOfWeek(now);

            return tasks.filter(task => {
                const taskDate = new Date(task.created_at);

                return (
                    taskDate >= currentWeekStart &&
                    taskDate <= currentWeekEnd
                );
            });
        }

        if (selectedPeriod === "LAST_WEEK") {
            const start = new Date(currentWeekStart);
            start.setDate(start.getDate() - 7);

            const end = new Date(currentWeekStart);
            end.setMilliseconds(-1);

            return tasks.filter(task => {
                const taskDate = new Date(task.created_at);

                return (
                    taskDate >= start &&
                    taskDate <= end
                );
            });
        }

        if (selectedPeriod === "TWO_WEEKS_AGO") {
            const start = new Date(currentWeekStart);
            start.setDate(start.getDate() - 14);

            const end = new Date(currentWeekStart);
            end.setDate(end.getDate() - 7);
            end.setMilliseconds(-1);

            return tasks.filter(task => {
                const taskDate = new Date(task.created_at);

                return (
                    taskDate >= start &&
                    taskDate <= end
                );
            });
        }

        return tasks;
    };

    const periodTasks = getPeriodTasks();


    // Dashboard statistics
    const totalTasks = periodTasks.length;

    const completedTasks = periodTasks.filter(
        task => task.status === "COMPLETED"
    ).length;

    const inProgressTasks = periodTasks.filter(
        task => task.status === "IN_PROGRESS"
    ).length;

    const failedTasks = periodTasks.filter(
        task => task.status === "FAILED"
    ).length;

    const completionPercentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    const finishedTasks = completedTasks + failedTasks;

    const successRate = finishedTasks > 0
        ? Math.round((completedTasks / finishedTasks) * 100)
        : 0;

    const accountabilityScore = totalTasks > 0
    ? Math.round(
        (
            periodTasks.reduce((total, task) => {
                if (task.status === "COMPLETED") {
                    return total + 100;
                }

                if (task.status === "IN_PROGRESS") {
                    return total + 50;
                }

                if (task.status === "PENDING") {
                    return total + 25;
                }

                return total; // FAILED = 0
            }, 0) / totalTasks
        ) * 10
    )
    : 0;

    // Task table filtering
    const filteredTasks = tasklist === null
    ? periodTasks
    : periodTasks.filter(task => task.task_type === tasklist);

    const displayedTasks = filteredTasks.slice(0, 5);

    return (
        <main className="min-h-screen bg-[#18181b] px-4 py-8 text-white sm:px-6 lg:px-8">

            <div className="mx-auto max-w-7xl">

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <p className="mt-1 text-3xl text-gray-400">
                            Welcome back {user? <span className="font-bold text-white">{user.full_name}</span>  : ""}. <br />Keep going. 🔥
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                    <button
                        className="w-fit rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium transition hover:bg-violet-500"
                        onClick={() => setShowTaskOptions(true)}
                    >
                        + New Task
                    </button>

                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="rounded-md border border-white/10 bg-[#111113] px-3 py-1.5 text-xs text-gray-300 outline-none"
                    >
                        <option value="THIS_WEEK">This Week</option>
                        <option value="LAST_WEEK">Last Week</option>
                        <option value="TWO_WEEKS_AGO">2 Weeks Ago</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="ALL_TIME">All Time</option>
                    </select>
                </div>

                </div>


                {/* Stats */}
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-xl border border-white/10 bg-[#111113] p-5">
                        <p className="text-sm text-gray-400">
                            Tasks Completed
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            {completedTasks}
                        </h2>

                        {/* <p className="mt-2 text-xs text-green-400">
                            ↑ 20% vs last month
                        </p> */}
                    </div>


                    <div className="rounded-xl border border-white/10 bg-[#111113] p-5">
                        <p className="text-sm text-gray-400">
                            Success Rate
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            {successRate}%
                        </h2>

                        {/* <p className="mt-2 text-xs text-green-400">
                            ↑ 12% vs last month
                        </p> */}
                    </div>


                    <div className="rounded-xl border border-white/10 bg-[#111113] p-5">
                        <p className="text-sm text-gray-400">
                            Current Streak
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            0 <span className="text-sm font-normal text-gray-400">Days</span>
                        </h2>

                        <p className="mt-2 text-xs text-gray-500">
                            Best: To be calculated
                        </p>
                    </div>


                    <div className="rounded-xl border border-white/10 bg-[#111113] p-5">
                        <p className="text-sm text-gray-400">
                            Accountability Score
                        </p>

                        <h2 className="mt-2 text-2xl font-bold">
                            {accountabilityScore}
                        </h2>

                        <p
                            className={`mt-2 text-xs ${
                                accountabilityScore >= 800
                                    ? "text-green-400"
                                    : accountabilityScore >= 600
                                    ? "text-yellow-400"
                                    : "text-red-400"
                            }`}
                        >
                            • {
                                accountabilityScore >= 800
                                    ? "Excellent"
                                    : accountabilityScore >= 600
                                    ? "Good"
                                    : accountabilityScore >= 400
                                    ? "Fair"
                                    : "Needs Improvement"
                            }
                        </p>
                    </div>

                </div>


                {/* Progress + AI Insight */}
                <div className="mt-4 grid gap-4 lg:grid-cols-2">

                    {/* Progress */}
                    <div className="rounded-xl border border-white/10 bg-[#111113] p-6">

                        <div className="flex items-center justify-between">

                            <h2 className="font-semibold">
                                My Progress
                            </h2>

                        </div>


                        <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">

                            {/* Progress circle */}
                            <div className="h-40 w-40">
                                <CircularProgressbar
                                    value={completionPercentage}
                                    text={`${completionPercentage}%`}
                                    styles={buildStyles({
                                        textSize: "24px",
                                        pathColor: "#8b5cf6",
                                        textColor: "#ffffff",
                                        trailColor: "#27272a",
                                    })}
                                />
                            </div>


                            {/* Progress breakdown */}
                            <div className="space-y-4 text-sm">

                                <div className="flex items-center justify-between gap-8">
                                    <span className="text-gray-400">
                                        <span className="mr-2 text-green-400">●</span>
                                        Completed
                                    </span>
                                    <span>{completedTasks}</span>
                                </div>

                                <div className="flex items-center justify-between gap-8">
                                    <span className="text-gray-400">
                                        <span className="mr-2 text-blue-400">●</span>
                                        In Progress
                                    </span>
                                    <span>{inProgressTasks}</span>
                                </div>

                                <div className="flex items-center justify-between gap-8">
                                    <span className="text-gray-400">
                                        <span className="mr-2 text-yellow-400">●</span>
                                        Failed
                                    </span>
                                    <span>{failedTasks}</span>
                                </div>


                            </div>

                        </div>

                    </div>


                    {/* AI Insight */}
                    <div className="rounded-xl border border-white/10 bg-[#111113] p-6">

                        <h2 className="font-semibold">
                            AI Insight
                        </h2>

                        <div className="mt-6 rounded-xl bg-violet-500/10 p-6">

                            <div className="flex gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-2xl">
                                    {aiLoading
                                        ? "◌"
                                        : aiInsight?.emoji || "✦"
                                    }
                                </div>

                                <div className="min-w-0">

                                    <h3 className="font-medium">
                                        {aiLoading
                                            ? "Analyzing your performance..."
                                            : aiInsight?.title || "Your Accountability Insight"
                                        }
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-gray-400">
                                        {aiLoading
                                            ? "The accountability analyst is reviewing your task patterns."
                                            : aiError
                                                ? aiError
                                                : aiInsight?.message ||
                                                "Complete some tasks to generate your first AI insight."
                                        }
                                    </p>

                                    {!aiLoading &&
                                        !aiError &&
                                        aiInsight?.suggestions?.length > 0 && (

                                        <>
                                            <button
                                                onClick={() =>
                                                    setShowSuggestions(!showSuggestions)
                                                }
                                                className="mt-4 rounded-md border border-violet-400/30 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-violet-500/10"
                                            >
                                                {showSuggestions
                                                    ? "Hide suggestions"
                                                    : "View suggestions"
                                                }
                                            </button>

                                            {showSuggestions && (
                                                <div className="mt-4 space-y-2">

                                                    {aiInsight.suggestions.map(
                                                        (suggestion, index) => (

                                                        <div
                                                            key={index}
                                                            className="rounded-lg border border-white/5 bg-black/20 p-3 text-xs leading-5 text-gray-300"
                                                        >
                                                            <span className="mr-2 text-violet-300">
                                                                {index + 1}.
                                                            </span>

                                                            {suggestion}
                                                        </div>

                                                    ))}

                                                </div>
                                            )}

                                        </>
                                    )}

                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* Tasks */}
                <div className="mt-4 rounded-xl border border-white/10 bg-[#111113] p-5">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <h2 className="font-semibold">
                            My Tasks
                        </h2>

                    </div>


                    {/* Filters */}
                    <div className="mt-5 flex gap-5 border-b border-white/10 text-sm">
                        <button
                            onClick={() => setTaskList(null)}
                            className={`pb-3 transition-colors ${
                                tasklist === null
                                    ? "border-b-2 border-violet-500 text-violet-400 font-medium"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            All
                        </button>

                        <button
                            onClick={() => setTaskList("NORMAL")}
                            className={`pb-3 transition-colors ${
                                tasklist === "NORMAL"
                                    ? "border-b-2 border-violet-500 text-violet-400 font-medium"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Normal
                        </button>

                        <button
                            onClick={() => setTaskList("HIGH_STAKES")}
                            className={`pb-3 transition-colors ${
                                tasklist === "HIGH_STAKES"
                                    ? "border-b-2 border-violet-500 text-violet-400 font-medium"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            High Stakes
                        </button>
                    </div>


                    {/* Desktop table */}
                    <div className="mt-5 hidden overflow-x-auto md:block">

                        <table className="w-full text-left text-sm">

                            <thead className="border-b border-white/10 text-xs text-gray-500">

                                <tr>
                                    <th className="pb-3 font-medium">Task</th>
                                    <th className="pb-3 font-medium">Type</th>
                                    <th className="pb-3 font-medium">Deadline</th>
                                    <th className="pb-3 font-medium">Status</th>
                                </tr>

                            </thead>

                            <tbody>

                                {displayedTasks.map((task, index) => (

                                    <tr
                                        key={index}
                                        className="border-b border-white/5 last:border-0"
                                    >

                                        <td className="py-4 font-medium">
                                            {task.title}
                                        </td>

                                        <td className="py-4">
                                            <span className={`rounded-md px-2 py-1 text-xs ${
                                                task.task_type === "HIGH_STAKES"
                                                    ? "bg-red-500/10 text-red-400"
                                                    : "bg-blue-500/10 text-blue-400"
                                            }`}>
                                                {task.task_type}
                                            </span>
                                        </td>

                                        <td className="py-4 text-gray-400">
                                            {formatDeadline(task.deadline)}
                                        </td>

                                        {/* <td className="py-4 text-gray-300">
                                            {task.progress}
                                        </td> */}

                                        <td className="py-4">
                                            <span className={`rounded-md px-2 py-1 text-xs ${
                                                task.status === "COMPLETED"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : task.status === "IN_PROGRESS"
                                                        ? "bg-blue-500/10 text-blue-400"
                                                        : "bg-yellow-500/10 text-yellow-400"
                                            }`}>
                                                {task.status}
                                            </span>
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>


                    {/* Mobile tasks */}
                    <div className="mt-5 space-y-3 md:hidden">

                        {displayedTasks.map((task, index) => (

                            <div
                                key={index}
                                className="rounded-lg border border-white/10 p-4"
                            >

                                <div className="flex items-start justify-between gap-4">

                                    <div>
                                        <h3 className="text-sm font-medium">
                                            {task.title}
                                        </h3>

                                        <p className="mt-1 text-xs text-gray-500">
                                            {formatDeadline(task.deadline)}
                                        </p>
                                    </div>

                                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs ${
                                        task.task_type === "HIGH_STAKES"
                                            ? "bg-red-500/10 text-red-400"
                                            : "bg-blue-500/10 text-blue-400"
                                    }`}>
                                        {task.task_type}
                                    </span>

                                </div>


                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">

                                    <div
                                        className={`h-full ${
                                            task.status === "COMPLETED"
                                                ? "w-full bg-green-500"
                                                : task.status === "IN_PROGRESS"
                                                    ? "w-2/3 bg-violet-500"
                                                    : "w-0"
                                        }`}
                                    />

                                </div>


                                <div className="mt-3">

                                    <span className={`rounded-md px-2 py-1 text-xs ${
                                        task.status === "COMPLETED"
                                            ? "bg-green-500/10 text-green-400"
                                            : task.status === "IN_PROGRESS"
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "bg-yellow-500/10 text-yellow-400"
                                    }`}>
                                        {task.status}
                                    </span>

                                </div>

                            </div>

                        ))}

                    </div>


                    <button className="mt-5 text-sm text-violet-400 hover:text-violet-300" onClick={() => navigate("/alltasks")}>
                        View all tasks →
                    </button>

                </div>

            </div>

            {showTaskOptions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111113] p-6 shadow-2xl">

                        <div className="flex items-start justify-between">

                            <div>
                                <h2 className="text-xl font-bold">
                                    Create a Task
                                </h2>

                                <p className="mt-1 text-sm text-gray-400">
                                    Choose how much accountability you want.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowTaskOptions(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                ✕
                            </button>

                        </div>


                        <div className="mt-6 space-y-3">

                            <button
                                onClick={() => navigate("/tasks/new/normal-task")}
                                className="w-full rounded-xl border border-white/10 p-5 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
                            >
                                <h3 className="font-semibold">
                                    Normal Task
                                </h3>

                                <p className="mt-1 text-sm text-gray-400">
                                    Set a goal and deadline. Stay accountable with XP.
                                </p>
                            </button>


                            <button
                                onClick={() => navigate("/tasks/new/high-stake")}
                                className="w-full rounded-xl border border-violet-500/20 p-5 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
                            >
                                <div className="flex items-center justify-between">

                                    <h3 className="font-semibold">
                                        High Stake Task
                                    </h3>

                                    <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-400">
                                        Money at stake
                                    </span>

                                </div>

                                <p className="mt-1 text-sm text-gray-400">
                                    Put real money behind your commitment.
                                </p>
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </main>
    );
};

export default Dashboard;