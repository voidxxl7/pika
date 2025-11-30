import {useEffect} from 'react';
import {App, Button, Card, Form, InputNumber, Space, Spin} from 'antd';
import {Database, Clock, BarChart3} from 'lucide-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {MetricsConfig} from '@/api/property.ts';
import {getMetricsConfig, saveMetricsConfig} from '@/api/property.ts';
import {getErrorMessage} from '@/lib/utils';

const MetricsConfigComponent = () => {
    const [form] = Form.useForm();
    const {message: messageApi} = App.useApp();
    const queryClient = useQueryClient();

    // 获取指标配置
    const {data: metricsConfig, isLoading} = useQuery({
        queryKey: ['metricsConfig'],
        queryFn: getMetricsConfig,
    });

    // 保存指标配置 mutation
    const saveMutation = useMutation({
        mutationFn: saveMetricsConfig,
        onSuccess: () => {
            messageApi.success('配置保存成功');
            queryClient.invalidateQueries({queryKey: ['metricsConfig']});
        },
        onError: (error: unknown) => {
            messageApi.error(getErrorMessage(error, '保存配置失败'));
        },
    });

    // 初始化表单
    useEffect(() => {
        if (metricsConfig) {
            form.setFieldsValue({
                retentionHours: metricsConfig.retentionHours,
                maxQueryPoints: metricsConfig.maxQueryPoints,
            });
        }
    }, [metricsConfig, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            saveMutation.mutate({
                retentionHours: values.retentionHours,
                maxQueryPoints: values.maxQueryPoints,
            } as MetricsConfig);
        } catch (error) {
            // 表单验证失败
        }
    };

    const handleReset = () => {
        if (metricsConfig) {
            form.setFieldsValue({
                retentionHours: metricsConfig.retentionHours,
                maxQueryPoints: metricsConfig.maxQueryPoints,
            });
        }
    };

    // 计算保留天数
    const getRetentionDays = (hours: number) => {
        return (hours / 24).toFixed(1);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Spin />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Database size={20}/>
                    指标数据配置
                </h2>
                <p className="text-gray-500 mt-2">配置监控指标数据的保留时长和查询限制，优化存储空间和查询性能</p>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
                <Space direction="vertical" className="w-full" >
                    {/* 数据保留策略 */}
                    <Card
                        title={
                            <div className="flex items-center gap-2">
                                <Clock size={18}/>
                                <span>数据保留策略</span>
                            </div>
                        }
                        type="inner"
                    >
                        <Form.Item
                            label="数据保留时长"
                            name="retentionHours"
                            rules={[
                                {required: true, message: '请输入数据保留时长'},
                                {
                                    type: 'number',
                                    min: 24,
                                    max: 720,
                                    message: '保留时长必须在 24-720 小时之间（1-30天）'
                                },
                            ]}
                            tooltip="原始指标数据和聚合数据的保留时长，超过此时长的数据将被自动清理"
                        >
                            <InputNumber
                                min={24}
                                max={720}
                                step={24}
                                addonAfter="小时"
                                style={{width: 200}}
                                placeholder="168"
                            />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate>
                            {({getFieldValue}) => {
                                const hours = getFieldValue('retentionHours');
                                return hours ? (
                                    <div className="mb-4 text-sm text-gray-500">
                                        当前设置约为 <span
                                        className="font-semibold text-blue-600">{getRetentionDays(hours)}</span> 天
                                    </div>
                                ) : null;
                            }}
                        </Form.Item>

                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                                <div className="font-semibold flex items-center gap-2">
                                    💡 保留策略说明
                                </div>
                                <ul className="list-disc list-inside space-y-1.5 ml-2">
                                    <li>系统会保留<strong>原始数据</strong>和<strong>多种粒度的聚合数据</strong>（1分钟、5分钟、1小时）</li>
                                    <li>聚合数据自动生成，用于优化长时间范围的查询性能</li>
                                    <li>较短的保留时长可以<strong>节省存储空间</strong>，减少数据库压力</li>
                                    <li>修改后立即生效，下次清理任务时应用新策略（每小时执行一次）</li>
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* 保存按钮 */}
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={saveMutation.isPending} >
                                保存配置
                            </Button>
                            <Button onClick={handleReset} >
                                重置
                            </Button>
                        </Space>
                    </Form.Item>
                </Space>
            </Form>
        </div>
    );
};

export default MetricsConfigComponent;
