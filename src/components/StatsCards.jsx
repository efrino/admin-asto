// ==================== src/components/StatsCards.jsx ====================
import {
    Users,
    BookOpen,
    Film,
    FileSpreadsheet,
    FolderOpen,
    AlertTriangle,
    HelpCircle,
    Activity
} from 'lucide-react';

export const StatsCards = ({ stats }) => {
    const cardData = [
        {
            label: 'Users',
            active: stats.activeUsers || 0,
            total: stats.totalUsers || 0,
            icon: Users,
            gradient: 'from-blue-500 to-blue-600',
            textLight: 'text-blue-100',
            textMuted: 'text-blue-200',
            iconColor: 'text-blue-200'
        },
        {
            label: 'Modules',
            active: stats.activeModules?.module || 0,
            total: stats.totalModules?.module || 0,
            icon: BookOpen,
            gradient: 'from-indigo-500 to-indigo-600',
            textLight: 'text-indigo-100',
            textMuted: 'text-indigo-200',
            iconColor: 'text-indigo-200'
        },
        {
            label: 'Animations',
            active: stats.activeModules?.animation || 0,
            total: stats.totalModules?.animation || 0,
            icon: Film,
            gradient: 'from-teal-500 to-teal-600',
            textLight: 'text-teal-100',
            textMuted: 'text-teal-200',
            iconColor: 'text-teal-200'
        },
        {
            label: 'Meca Sheet',
            active: stats.activeModules?.meca_sheet || 0,
            total: stats.totalModules?.meca_sheet || 0,
            icon: FileSpreadsheet,
            gradient: 'from-green-500 to-green-600',
            textLight: 'text-green-100',
            textMuted: 'text-green-200',
            iconColor: 'text-green-200'
        },
        {
            label: 'Meca Aid',
            active: stats.activeModules?.meca_aid || 0,
            total: stats.totalModules?.meca_aid || 0,
            icon: FolderOpen,
            gradient: 'from-orange-500 to-orange-600',
            textLight: 'text-orange-100',
            textMuted: 'text-orange-200',
            iconColor: 'text-orange-200'
        },
        {
            label: 'Error Codes',
            active: stats.activeErrorCodes || 0,
            total: stats.totalErrorCodes || 0,
            icon: AlertTriangle,
            gradient: 'from-red-500 to-red-600',
            textLight: 'text-red-100',
            textMuted: 'text-red-200',
            iconColor: 'text-red-200'
        },
        {
            label: 'Quizzes',
            active: stats.activeQuizzes || 0,
            total: stats.totalQuizzes || 0,
            icon: HelpCircle,
            gradient: 'from-purple-500 to-purple-600',
            textLight: 'text-purple-100',
            textMuted: 'text-purple-200',
            iconColor: 'text-purple-200'
        },
        {
            label: 'Activities',
            active: stats.todayActivities || 0,
            total: stats.totalActivities || 0,
            icon: Activity,
            gradient: 'from-pink-500 to-pink-600',
            textLight: 'text-pink-100',
            textMuted: 'text-pink-200',
            iconColor: 'text-pink-200',
            isActivity: true
        }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3 mb-4 sm:mb-6">
            {cardData.map((card, index) => {
                const IconComponent = card.icon;
                return (
                    <div
                        key={index}
                        className={`bg-gradient-to-br ${card.gradient} rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 text-white`}
                    >
                        <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                                <p className={`${card.textLight} text-[10px] sm:text-xs font-medium truncate`}>
                                    {card.label}
                                </p>
                                <div className="flex items-baseline gap-0.5 mt-1 sm:mt-2">
                                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold">
                                        {card.active}
                                    </span>
                                    <span className={`${card.textMuted} text-xs sm:text-sm lg:text-base`}>
                                        /{card.total}
                                    </span>
                                </div>
                                <p className={`${card.textMuted} text-[8px] sm:text-[10px] mt-0.5 sm:mt-1`}>
                                    {card.isActivity ? 'today/total' : 'active/total'}
                                </p>
                            </div>
                            <IconComponent className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 ${card.iconColor} flex-shrink-0 opacity-80`} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};