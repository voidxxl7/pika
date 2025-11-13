import {Activity, LayoutGrid, List, LogIn, Server} from 'lucide-react';
import GithubSvg from "../assets/github.svg";

interface PublicHeaderProps {
    title: string;
    lastUpdated?: string;
    viewMode?: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;
    showViewToggle?: boolean;
}

const PublicHeader = ({
                          title,
                          lastUpdated,
                          viewMode,
                          onViewModeChange,
                          showViewToggle = false
                      }: PublicHeaderProps) => {
    return (
        <header className="border-b border-slate-200 bg-white/95">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* 左侧：标题 */}
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-blue-500/80">Pika Monitor</p>
                        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
                    </div>

                    {/* 右侧：操作区域 */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {/* 最后更新时间 */}
                        {lastUpdated && (
                            <>
                                <span>
                                    最后更新：
                                    <span className="font-semibold text-slate-900">{lastUpdated}</span>
                                </span>
                                <span className="hidden h-4 w-px bg-slate-200 sm:inline-block"/>
                            </>
                        )}

                        {/* 视图切换 */}
                        {showViewToggle && viewMode && onViewModeChange && (
                            <>
                                <div
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                    <button
                                        type="button"
                                        onClick={() => onViewModeChange('grid')}
                                        className={`inline-flex items-center gap-1 rounded-lg p-1 text-xs font-medium transition cursor-pointer ${
                                            viewMode === 'grid'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-blue-600'
                                        }`}
                                    >
                                        <LayoutGrid className="h-4 w-4"/>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onViewModeChange('list')}
                                        className={`inline-flex items-center gap-1 rounded-lg p-1 text-xs font-medium transition cursor-pointer ${
                                            viewMode === 'list'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-blue-600'
                                        }`}
                                    >
                                        <List className="h-4 w-4"/>
                                    </button>
                                </div>
                                <span className="hidden h-4 w-px bg-slate-200 sm:inline-block"/>
                            </>
                        )}

                        {/* GitHub 链接 */}
                        <a
                            href="https://github.com/dushixiang/pika"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
                        >
                            <img src={GithubSvg} className="h-4 w-4" alt="github"/>
                        </a>

                        {/* 服务器链接 */}
                        <a
                            href={'/'}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                        >
                            <Server className="h-4 w-4"/>
                            服务器
                        </a>

                        {/* 监控链接 */}
                        <a
                            href={'/monitors'}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                        >
                            <Activity className="h-4 w-4"/>
                            服务监控
                        </a>

                        {/* 登录按钮 */}
                        <a
                            href={'/login'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                        >
                            <LogIn className="h-4 w-4"/>
                            登录
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PublicHeader;
