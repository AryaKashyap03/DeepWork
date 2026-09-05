import { useAuth } from "../context/AuthContext";
import think2 from "../assets/think2.jpg"
import handshake from "../assets/handshake.png"
import bulb from "../assets/bulb.png"
import robot from "../assets/robot.png"
import pay from "../assets/pay.png"
import github from "../assets/github.png"
import DeepworkWorkingCard from "../components/DeepworkWorkingCard";

const Home = () => {

    const card_data = [
        {
            "img" : handshake,
            "heading" : "1. Commit",
            content : "Define your goal and deadline. Make it real."
        },
        {
            "img" : bulb,
            "heading" : "2. Put skin in the game",
            content : "Use High Stakes to add a financial consequence if you don't follow through with your commitment."
        },
        {
            "img" : robot,
            "heading" : "3. Get AI support",
            content : "Our Al helps you plan better, stay on track, and overcome roadblocks."
        },
        {
            "img" : pay,
            "heading" : "4. Achieve or Pay",
            content : "Complete your task and win. Fail to do so, and the consequence is triggered."
        }
    ]
    const { user, logout } = useAuth();

    return (
        <>
        <section className="min-h-screen text-white">
            <div className="mx-auto max-w-6xl px-6 py-20">

                <div className="grid items-center gap-12 md:grid-cols-2">

                    <div className="flex flex-col gap-6">

                        <div>

                            <h1 className="text-5xl font-bold leading-tight md:text-6xl">
                                Beat Procrastination.
                            </h1>

                            <h1 className="text-5xl font-bold leading-tight text-violet-400 md:text-6xl">
                                Build Discipline.
                            </h1>

                            <h1 className="text-5xl font-bold leading-tight text-violet-400 md:text-6xl">
                                Get Results.
                            </h1>
                        </div>

                        <p className="max-w-xl text-lg leading-8 text-gray-400">
                            Research shows we're more likely to follow through when
                            something valuable is at stake. DeepWork makes it easier
                            to turn intentions into action.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <a href="/signup" className=" bg-violet-600 px-5 py-3 text-sm font-medium transition hover:bg-violet-500">
                                Get Started
                            </a>

                            <a href="/about" className=" border border-white/20 px-5 py-3 text-sm font-medium transition hover:border-violet-400 hover:bg-violet-500/10">
                                Learn More
                            </a>
                        </div>

                    </div>

                    <div className="flex justify-center">
                        <img
                            src={think2}
                            alt="Person thinking about their goals"
                            className="w-full max-w-md "
                        />
                    </div>

                </div>

            </div>

        </section>
        <section className="border-y border-white/10 ">
            <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-5">

                <div className="border-b border-white/10 p-6 text-center md:border-b-0 md:border-r">
                    <h3 className="text-2xl font-bold text-violet-400">
                        1 Goal
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                        Clear and focused
                    </p>
                </div>

                <div className="border-b border-white/10 p-6 text-center md:border-b-0 md:border-r">
                    <h3 className="text-2xl font-bold text-violet-400">
                        Built on
                    </h3>
                    <p className="mt-2 text-sm text-gray-400 ">
                        Science
                    </p>
                </div>

                <div className="border-b border-white/10 p-6 text-center md:border-b-0 md:border-r">
                    <h3 className="text-2xl font-bold text-violet-400">
                        2x more likely
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                        To complete tasks
                    </p>
                </div>

                <div className="border-r-0 border-white/10 p-6 text-center md:border-r">
                    <h3 className="text-2xl font-bold text-violet-400">
                        80% users
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                        Build better habits
                    </p>
                </div>

                <div className="p-6 text-center">
                    <h3 className="text-2xl font-bold text-violet-400">
                        0 Excuses
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                        Follow through
                    </p>
                </div>

            </div>
        </section>
        <section className="px-6 py-20 ">
            <div className="mx-auto flex max-w-6xl flex-col items-center">

                <div className="flex items-center gap-2">
                    <h2 className="text-3xl text-white">How</h2>
                    <h2 className="text-3xl font-bold text-violet-400">
                        DeepWork
                    </h2>
                    <h2 className="text-3xl text-white">works?</h2>
                </div>

                <p className="mt-4 max-w-xl text-center text-gray-400">
                    A simple four-step process designed to turn your intentions
                    into commitments and your commitments into results.
                </p>

                <div className="mt-12 grid w-full gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {card_data.map((data, index) => (
                        <DeepworkWorkingCard
                            key={index}
                            imgpath={data.img}
                            cardheading={data.heading}
                            cardcontent={data.content}
                        />
                    ))}
                </div>

            </div>
        </section>
        <section className="bg-[#18181b] px-6 py-24 text-white">
    
            {/* Section introduction */}
            <div className="mx-auto flex max-w-5xl items-stretch justify-center gap-3 px-2 sm:gap-6">

                <div className="flex items-center">
                    <span className="text-7xl font-light leading-none text-violet-400 sm:text-8xl md:text-9xl">
                        {"{"}
                    </span>
                </div>

                <div className="flex max-w-3xl flex-1 flex-col items-center justify-center text-center">

                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400 sm:text-sm">
                        Your way to work
                    </p>

                    <h2 className="mt-3 text-3xl font-bold sm:text-4xl md:text-5xl">
                        Two ways to commit.
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:mt-5 sm:text-base sm:leading-8 md:text-lg">
                        Not every goal needs the same level of accountability.
                        Create a normal task when you just need to get something done,
                        or put real stakes behind it when the goal truly matters.
                    </p>

                </div>

                <div className="flex items-center">
                    <span className="text-7xl font-light leading-none text-violet-400 sm:text-8xl md:text-9xl">
                        {"}"}
                    </span>
                </div>

            </div>


            {/* Task types */}
            <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-2">

                {/* Normal Task */}
                <div className="rounded-3xl border border-white/10 bg-[#111113] p-8">

                    <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-xl">
                            ✓
                        </div>

                        <div>

                            <h3 className="text-2xl font-bold">
                                Normal Task
                            </h3>
                        </div>

                    </div>


                    <p className="mt-6 leading-7 text-slate-100">
                        Create a task with a title, description, and deadline.
                        Complete it on time and earn XP. Miss the deadline and
                        you'll lose a small amount of XP.
                    </p>


                    <div className="mt-7 space-y-4">

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Set a title, description, and deadline
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Get AI assistance throughout the task
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Earn XP when you complete it
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Lose a little XP if you miss the deadline
                            </p>
                        </div>

                    </div>


                    {/* Small UI preview */}
                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#18181b] p-5">

                        <p className="text-xs text-gray-500">
                            Example task
                        </p>

                        <h4 className="mt-2 font-semibold">
                            Solve 5 DSA problems
                        </h4>

                        <p className="mt-2 text-sm text-gray-500">
                            Focus on arrays and binary search.
                        </p>

                        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">

                            <span className="text-sm text-gray-500">
                                Deadline
                            </span>

                            <span className="text-sm text-gray-300">
                                Today, 11:59 PM
                            </span>

                        </div>

                        <div className="mt-3 flex items-center justify-between">

                            <span className="text-sm text-gray-500">
                                Reward
                            </span>

                            <span className="text-sm font-medium text-violet-400">
                                +50 XP
                            </span>

                        </div>

                    </div>

                </div>


                {/* High Stake Task */}
                <div className="rounded-3xl border border-violet-500/20 bg-[#111113] p-8">

                    <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-xl">
                            ₹
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold">
                                High Stake Task
                            </h3>
                        </div>

                    </div>


                    <p className="mt-6 leading-7 text-slate-100">
                        Everything a normal task has, plus something real at stake.
                        Choose a recipient, set an amount, and commit your money
                        to the deadline.
                    </p>


                    <div className="mt-7 space-y-4">

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Everything included in a normal task
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Choose a friend or a family member
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Set the amount you're willing to stake
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Pay securely through Razorpay
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Complete on time and get your money back
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <span className="text-violet-400">✓</span>
                            <p className="text-sm text-gray-300">
                                Miss the deadline and the stake goes to your recipient
                            </p>
                        </div>

                    </div>


                    {/* Small UI preview */}
                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#18181b] p-5">

                        <p className="text-xs text-gray-500">
                            Example high stake task
                        </p>

                        <h4 className="mt-2 font-semibold">
                            Solve 5 DSA problems today
                        </h4>

                        <div className="mt-5 space-y-3">

                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">
                                    Deadline
                                </span>

                                <span className="text-sm">
                                    Today, 11:59 PM
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">
                                    Recipient
                                </span>

                                <span className="text-sm">
                                    Aman
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">
                                    Stake
                                </span>

                                <span className="text-sm font-semibold text-violet-400">
                                    ₹500
                                </span>
                            </div>

                        </div>

                        <div className="mt-5 rounded-lg bg-violet-500/10 px-4 py-3 text-center text-sm text-violet-300">
                            Complete on time → ₹500 refunded
                        </div>

                    </div>

                </div>

            </div>


        </section>

        {/* CTA + Footer */}
        <section className=" text-white">

            {/* Final CTA */}
            <div className="border-b border-white/10 px-6 py-24 text-center">

                <div className="mx-auto max-w-2xl">

                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-400">
                        Ready?
                    </p>

                    <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                        You know what you need to do.
                    </h2>

                    <p className="mt-2 text-4xl font-bold text-violet-400 sm:text-5xl">
                        Now give yourself a reason to do it.
                    </p>

                    <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-gray-200">
                        Create your first task, set a deadline, and start building
                        the habit of following through.
                    </p>

                    
                    <a href="/signup">
                    <button className="mt-8 rounded-lg bg-violet-600 px-7 py-3 font-medium transition hover:bg-violet-500">Get Started</button>
                    </a>
                

                </div>

            </div>


            {/* Footer */}
            <footer className="px-6 py-12">

                <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 md:grid-cols-4">

                    {/* Brand */}
                    <div className="sm:col-span-2">

                        <a
                            href="/"
                            className="flex items-center gap-2 text-xl font-bold"
                        >
                            DeepWork
                        </a>

                        <p className="mt-4 max-w-sm text-sm leading-6 text-gray-300">
                            An accountability platform built to help you beat
                            procrastination, build discipline, and actually
                            finish what you start.
                        </p>

                    </div>


                    {/* Product */}
                    <div>

                        <h3 className="text-sm font-semibold text-white">
                            Product
                        </h3>

                        <div className="mt-4 space-y-3 text-sm text-gray-300">

                            <a
                                href="/dashboard"
                                className="block transition hover:text-white "
                            >
                                Dashboard
                            </a>

                            <a
                                href="/tasks"
                                className="block transition hover:text-white "
                            >
                                Tasks
                            </a>

                            <a
                                href="/highstakes"
                                className="block transition hover:text-white"
                            >
                                High Stakes
                            </a>

                        </div>

                    </div>


                    {/* Company */}
                    <div>

                        <h3 className="text-sm font-semibold text-white">
                            Company
                        </h3>

                        <div className="mt-4 space-y-3 text-sm text-gray-300">

                            <a
                                href="/about"
                                className="block transition hover:text-white"
                            >
                                About
                            </a>

                            <a
                                href="/privacy"
                                className="block transition hover:text-white"
                            >
                                Privacy Policy
                            </a>

                            <a
                                href="/terms"
                                className="block transition hover:text-white"
                            >
                                Terms of Service
                            </a>

                        </div>

                    </div>

                </div>


                {/* Bottom footer */}
                <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-white/10 pt-6 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">

                    <p>
                        © 2026 DeepWork. All rights reserved.
                    </p>

                    <div className="flex gap-5">

                        <a
                            href="#"
                            className="transition hover:text-white"
                            aria-label="Twitter"
                        >
                            𝕏
                        </a>

                        <a
                            href="#"
                            className="transition hover:text-white"
                            aria-label="LinkedIn"
                        >
                            in
                        </a>

                        <a
                            href="https://github.com/AryaKashyap03" target="_blank"
                            className="transition hover:text-white"
                            aria-label="Github"
                        >
                            Github
                        </a>

                    </div>

                </div>

            </footer>

        </section>
        </>
    );
};

export default Home;

