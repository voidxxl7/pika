// 统计卡片组件
import {cn} from "@/lib/utils.ts";

interface Props {
    title: string;
    value: any;
    unit?: string
    icon: any;
    color: string;
    alert?: boolean,
    glow?: boolean,
}

const StatBlock = ({title, value, unit, icon: Icon, color, alert, glow}: Props) => {

    const colorMap = {
        cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5',
        emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
        rose: 'text-rose-400 border-rose-500/30 bg-rose-500/5',
        purple: 'text-purple-400 border-purple-500/30 bg-purple-500/5'
    };
    const style = colorMap[color] || colorMap.cyan;

    return (
        <div
            className={cn(
                `relative overflow-hidden rounded-xl border p-5`,
                style,
                alert && 'animate-pulse bg-rose-500/10',
                glow && 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
            )}>
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-[-15deg]"><Icon className="w-24 h-24"/></div>
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="text-xs font-bold font-mono uppercase tracking-widest opacity-70 mb-2">{title}</div>
                    <div className="text-4xl font-black tracking-tight flex items-baseline gap-1">{value}{unit &&
                        <span className="text-sm font-normal opacity-60 ml-1">{unit}</span>}</div>
                </div>
                <div className={`p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/5`}><Icon
                    className="w-6 h-6"/></div>
            </div>
        </div>
    );
};

export default StatBlock;