const DeepworkWorkingCard = ({ imgpath, cardheading, cardcontent }) => {
    return (
        <div className="flex flex-col items-center group rounded-2xl border border-white/10 p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-500/40">

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <img
                    src={imgpath}
                    alt="User profile picture" 
                    className="h-8 w-8 rounded-full object-cover"
                />
            </div>


            <h3 className="mt-6 text-lg font-semibold text-white">
                {cardheading}
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-300">
                {cardcontent}
            </p>

        </div>
    );
};

export default DeepworkWorkingCard;