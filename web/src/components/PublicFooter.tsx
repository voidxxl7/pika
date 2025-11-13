const PublicFooter = () => {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-400">
                © {new Date().getFullYear()} Pika Monitor · 保持洞察，稳定运行。
            </div>
        </footer>
    );
};

export default PublicFooter;
