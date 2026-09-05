import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const AllTasks = () => {

    const navigate = useNavigate();
    const { accessToken } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [tasklist, setTaskList] = useState(null);

    const [loading, setLoading] = useState(true);
    const [completingTask, setCompletingTask] = useState(null);

    const [modal, setModal] = useState(null);


    const fetchTasks = async () => {

        try {

            setLoading(true);

            const response = await axios.get(
                "http://localhost:8000/tasks",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    withCredentials: true,
                    params: {
                        type: tasklist
                    }
                }
            );

            setTasks(response.data);

        } catch (err) {

            console.error("Failed to fetch tasks:", err);

        } finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        if (!accessToken) {
            return;
        }

        fetchTasks();

        const interval = setInterval(() => {
            fetchTasks();
        }, 5000);

        return () => clearInterval(interval);

    }, [accessToken, tasklist]);


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


    const getTimeRemaining = (deadline) => {

        const difference =
            getDeadlineTime(deadline) - Date.now();

        if (difference <= 0) {
            return "00:00:00";
        }

        const totalSeconds =
            Math.floor(difference / 1000);

        const hours =
            Math.floor(totalSeconds / 3600);

        const minutes =
            Math.floor((totalSeconds % 3600) / 60);

        const seconds =
            totalSeconds % 60;

        return (
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`
        );

    };


    const deadlinePassed = (deadline) => {

        return getDeadlineTime(deadline) <= Date.now();

    };


   const handleComplete = async (task) => {

        if (completingTask === task.id) {
            return;
        }

        if (deadlinePassed(task.deadline)) {

            setModal({
                type: "failed",
                message: "The deadline for this task has already passed."
            });

            // Refresh because the backend may already have
            // marked the task as FAILED.
            fetchTasks();

            return;
        }

        try {

            setCompletingTask(task.id);

            let response;

            if (task.task_type === "HIGH_STAKES") {

                response = await axios.post(
                    `http://localhost:8000/highstakes/${task.id}/complete`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        },
                        withCredentials: true
                    }
                );

            } else {

                response = await axios.post(
                    `http://localhost:8000/tasks/${task.id}/complete`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        },
                        withCredentials: true
                    }
                );
            }

            const updatedTask = response.data;

            // --------------------------------------
            // HIGH STAKES TASK
            // --------------------------------------

            if (task.task_type === "HIGH_STAKES") {

                setTasks((currentTasks) =>
                    currentTasks.map((currentTask) =>
                        currentTask.id === task.id
                            ? {
                                ...currentTask,
                                status: updatedTask.task_status
                            }
                            : currentTask
                    )
                );

                if (updatedTask.task_status === "COMPLETED") {

                    setModal({
                        type: "success",
                        message: "Your money has been refunded back to your account."
                    });

                } else if (updatedTask.task_status === "FAILED") {

                    setModal({
                        type: "failed",
                        message:
                            "The deadline had passed. Your stake has been transferred to the selected recipient."
                    });

                }

                return;
            }

            // --------------------------------------
            // NORMAL TASK
            // --------------------------------------

            setTasks((currentTasks) =>
                currentTasks.map((currentTask) =>
                    currentTask.id === task.id
                        ? updatedTask
                        : currentTask
                )
            );

        } catch (err) {

            console.error(
                "Failed to complete task:",
                err
            );

            if (err.response?.data?.detail) {

                setModal({
                    type: "error",
                    message: err.response.data.detail
                });

            } else {

                setModal({
                    type: "error",
                    message:
                        "Something went wrong while completing the task."
                });
            }

        } finally {

            setCompletingTask(null);
        }
    };


    return (

        <main className="min-h-screen bg-[#18181b] px-4 py-8 text-white sm:px-6">

            <div className="mx-auto max-w-7xl">


                {/* Header */}

                <button
                    onClick={() => navigate("/dashboard")}
                    className="mb-6 text-sm text-gray-400 transition hover:text-white"
                >
                    ← Back to Dashboard
                </button>


                <div>

                    <h1 className="text-3xl font-bold">
                        All Tasks
                    </h1>

                    <p className="mt-2 text-sm text-gray-400">
                        Everything you've committed to, all in one place.
                    </p>

                </div>


                {/* Task container */}

                <div className="mt-8 rounded-xl border border-white/10 bg-[#111113] p-5">


                    {/* Filters */}

                    <div className="flex gap-5 border-b border-white/10 text-sm">

                        <button
                            onClick={() => setTaskList(null)}
                            className={`pb-3 transition-colors ${
                                tasklist === null
                                    ? "border-b-2 border-violet-500 font-medium text-violet-400"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            All
                        </button>


                        <button
                            onClick={() => setTaskList("NORMAL")}
                            className={`pb-3 transition-colors ${
                                tasklist === "NORMAL"
                                    ? "border-b-2 border-violet-500 font-medium text-violet-400"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Normal
                        </button>


                        <button
                            onClick={() => setTaskList("HIGH_STAKES")}
                            className={`pb-3 transition-colors ${
                                tasklist === "HIGH_STAKES"
                                    ? "border-b-2 border-violet-500 font-medium text-violet-400"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            High Stakes
                        </button>

                    </div>


                    {/* Loading */}

                    {loading && (

                        <div className="py-12 text-center text-sm text-gray-500">
                            Loading tasks...
                        </div>

                    )}


                    {/* Empty */}

                    {!loading && tasks.length === 0 && (

                        <div className="py-12 text-center">

                            <p className="text-sm text-gray-400">
                                No tasks found.
                            </p>

                        </div>

                    )}


                    {/* Desktop table */}

                    {!loading && tasks.length > 0 && (

                        <div className="mt-5 hidden overflow-x-auto md:block">

                            <table className="w-full text-left text-sm">

                                <thead className="border-b border-white/10 text-xs text-gray-500">

                                    <tr>

                                        <th className="pb-3 font-medium">
                                            Task
                                        </th>

                                        <th className="pb-3 font-medium">
                                            Type
                                        </th>

                                        <th className="pb-3 font-medium">
                                            Deadline
                                        </th>

                                        <th className="pb-3 font-medium">
                                            Time Remaining
                                        </th>

                                        <th className="pb-3 font-medium">
                                            Status
                                        </th>

                                        <th className="pb-3 text-center font-medium">
                                            Mark as completed
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {tasks.map((task) => (

                                        <TaskRow
                                            key={task.id}
                                            task={task}
                                            onComplete={handleComplete}
                                            completingTask={completingTask}
                                            getTimeRemaining={getTimeRemaining}
                                            formatDeadline={formatDeadline}
                                            deadlinePassed={deadlinePassed}
                                        />

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}


                    {/* Mobile */}

                    {!loading && tasks.length > 0 && (

                        <div className="mt-5 space-y-3 md:hidden">

                            {tasks.map((task) => (

                                <MobileTaskCard
                                    key={task.id}
                                    task={task}
                                    onComplete={handleComplete}
                                    completingTask={completingTask}
                                    getTimeRemaining={getTimeRemaining}
                                    formatDeadline={formatDeadline}
                                    deadlinePassed={deadlinePassed}
                                />

                            ))}

                        </div>

                    )}

                </div>

            </div>


            {/* Success / failure modal */}

            {modal && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111113] p-6 shadow-2xl">


                        {modal.type === "success" && (

                            <>

                                <div className="mb-4 text-3xl">
                                    🎉
                                </div>

                                <h2 className="text-xl font-semibold">
                                    Commitment completed
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-gray-400">
                                    Yay, you completed your commitment
                                    before the deadline. That's the spirit.
                                </p>

                                <p className="mt-3 text-sm leading-6 text-green-400">
                                    Your money has been refunded back to your account. :)
                                </p>

                            </>

                        )}

                        {modal.type === "failed" && (

                            <>

                                <div className="mb-4 text-3xl">
                                    ⚠️
                                </div>

                                <h2 className="text-xl font-semibold text-red-400">
                                    {modal.highStakes
                                        ? "Commitment failed"
                                        : "Deadline passed"}
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-gray-400">
                                    {modal.highStakes
                                        ? "You missed the deadline for this high-stakes commitment."
                                        : "The deadline for this task has passed. This task can no longer be completed."}
                                </p>

                                {modal.highStakes && (

                                    <p className="mt-3 text-sm leading-6 text-red-400">
                                        Your stake has been transferred to the selected recipient.
                                    </p>

                                )}

                                {modal.highStakes && (

                                    <p className="mt-2 text-xs text-gray-500">
                                        Demo mode: recipient payout is simulated.
                                    </p>

                                )}

                            </>

                        )}


                        {modal.type === "error" && (

                            <>

                                <h2 className="text-xl font-semibold">
                                    Something went wrong
                                </h2>

                                <p className="mt-3 text-sm leading-6 text-gray-400">
                                    {modal.message}
                                </p>

                            </>

                        )}


                        <button
                            onClick={() => setModal(null)}
                            className="mt-6 w-full rounded-lg bg-violet-600 py-3 text-sm font-medium transition hover:bg-violet-500"
                        >
                            Continue
                        </button>

                    </div>

                </div>

            )}

        </main>

    );

};



/* Desktop row */

const TaskRow = ({
    task,
    onComplete,
    completingTask,
    getTimeRemaining,
    formatDeadline,
    deadlinePassed
}) => {

    const [timeRemaining, setTimeRemaining] = useState(
        getTimeRemaining(task.deadline)
    );


    useEffect(() => {

        if (
            task.status === "COMPLETED" ||
            task.status === "FAILED"
        ) {
            setTimeRemaining("00:00:00");
            return;
        }

        const interval = setInterval(() => {

            setTimeRemaining(
                getTimeRemaining(task.deadline)
            );

        }, 1000);

        return () => clearInterval(interval);

    }, [getTimeRemaining,task.deadline, task.status]);


    const hasPassed = deadlinePassed(task.deadline);

    const completed = task.status === "COMPLETED";
    const failed = task.status === "FAILED";


    return (

        <tr className="border-b border-white/5 last:border-0">

            <td className="py-4 font-medium">
                {task.title}
            </td>


            <td className="py-4">

                <span
                    className={`rounded-md px-2 py-1 text-xs ${
                        task.task_type === "HIGH_STAKES"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                    }`}
                >
                    {task.task_type === "HIGH_STAKES"
                        ? "HIGH STAKES"
                        : "NORMAL"}
                </span>

            </td>


            <td className="py-4 text-gray-400">
                {formatDeadline(task.deadline)}
            </td>


            <td className="py-4 font-mono text-xs">

                <span
                    className={
                        hasPassed
                            ? "text-red-400"
                            : "text-gray-300"
                    }
                >
                    {timeRemaining}
                </span>

            </td>


            <td className="py-4">

                <span
                    className={`rounded-md px-2 py-1 text-xs ${
                        completed
                            ? "bg-green-500/10 text-green-400"
                            : failed
                                ? "bg-red-500/10 text-red-400"
                                : "bg-yellow-500/10 text-yellow-400"
                    }`}
                >
                    {task.status}
                </span>

            </td>


            <td className="py-4 text-center">

                <input
                    type="checkbox"
                    checked={completed}
                    disabled={
                        completed ||
                        failed ||
                        hasPassed ||
                        completingTask === task.id
                    }
                    onChange={() => onComplete(task)}
                    className="h-4 w-4 cursor-pointer accent-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                />

            </td>

        </tr>

    );

};


/* Mobile card */

const MobileTaskCard = ({
    task,
    onComplete,
    completingTask,
    getTimeRemaining,
    formatDeadline,
    deadlinePassed
}) => {

    const [timeRemaining, setTimeRemaining] = useState(
        getTimeRemaining(task.deadline)
    );


    useEffect(() => {

        if (
            task.status === "COMPLETED" ||
            task.status === "FAILED"
        ) {
            setTimeRemaining("00:00:00");
            return;
        }

        const interval = setInterval(() => {

            setTimeRemaining(
                getTimeRemaining(task.deadline)
            );

        }, 1000);

        return () => clearInterval(interval);

    }, [getTimeRemaining ,task.deadline, task.status]);


    const hasPassed = deadlinePassed(task.deadline);

    const completed = task.status === "COMPLETED";
    const failed = task.status === "FAILED";


    return (

        <div className="rounded-lg border border-white/10 p-4">

            <div className="flex items-start justify-between gap-4">

                <div>

                    <h3 className="text-sm font-medium">
                        {task.title}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                        {formatDeadline(task.deadline)}
                    </p>

                </div>


                <span
                    className={`shrink-0 rounded-md px-2 py-1 text-xs ${
                        task.task_type === "HIGH_STAKES"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                    }`}
                >
                    {task.task_type === "HIGH_STAKES"
                        ? "HIGH STAKES"
                        : "NORMAL"}
                </span>

            </div>


            <div className="mt-4 flex items-center justify-between">

                <div>

                    <p className="text-xs text-gray-500">
                        Time remaining
                    </p>

                    <p
                        className={`mt-1 font-mono text-sm ${
                            hasPassed
                                ? "text-red-400"
                                : "text-gray-300"
                        }`}
                    >
                        {timeRemaining}
                    </p>

                </div>


                <input
                    type="checkbox"
                    checked={completed}
                    disabled={
                        completed ||
                        failed ||
                        hasPassed ||
                        completingTask === task.id
                    }
                    onChange={() => onComplete(task)}
                    className="h-5 w-5 cursor-pointer accent-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                />

            </div>


            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">

                <div
                    className={`h-full ${
                        completed
                            ? "w-full bg-green-500"
                            : task.status === "IN_PROGRESS"
                                ? "w-2/3 bg-violet-500"
                                : "w-0"
                    }`}
                />

            </div>


            <div className="mt-3">

                <span
                    className={`rounded-md px-2 py-1 text-xs ${
                        completed
                            ? "bg-green-500/10 text-green-400"
                            : failed
                                ? "bg-red-500/10 text-red-400"
                                : "bg-yellow-500/10 text-yellow-400"
                    }`}
                >
                    {task.status}
                </span>

            </div>

        </div>

    );

};


export default AllTasks;