import {useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {ActionType, ProColumns} from '@ant-design/pro-components';
import {ProTable} from '@ant-design/pro-components';
import {App, Button, DatePicker, Divider, Dropdown, Form, Input, Modal, Select, Space, Tag} from 'antd';
import type {MenuProps} from 'antd';
import {Edit, Eye, RefreshCw, Plus, Shield, Trash2, MoreVertical} from 'lucide-react';
import {deleteAgent, getAgentPaging, updateAgentInfo} from '../../api/agent';
import type {Agent} from '../../types';
import {getErrorMessage} from '../../lib/utils';
import dayjs from 'dayjs';
import {PageHeader} from '../../components';

const AgentList = () => {
    const navigate = useNavigate();
    const {message: messageApi, modal} = App.useApp();
    const actionRef = useRef<ActionType>(null);
    const [form] = Form.useForm();
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(false);

    // 打开编辑模态框
    const handleEdit = (agent: Agent) => {
        setCurrentAgent(agent);
        form.setFieldsValue({
            name: agent.name,
            platform: agent.platform,
            location: agent.location,
            expireTime: agent.expireTime ? dayjs(agent.expireTime) : null,
            visibility: agent.visibility || 'public',
        });
        setEditModalVisible(true);
    };


    // 保存探针信息
    const handleSave = async () => {
        if (!currentAgent) return;

        try {
            const values = await form.validateFields();
            setLoading(true);

            // 转换到期时间为时间戳（设置为当天的23:59:59）
            const data: any = {
                name: values.name,
                platform: values.platform,
                location: values.location,
                visibility: values.visibility || 'public',
            };

            if (values.expireTime) {
                data.expireTime = values.expireTime.endOf('day').valueOf();
            }

            await updateAgentInfo(currentAgent.id, data);
            messageApi.success('探针信息更新成功');
            setEditModalVisible(false);
            actionRef.current?.reload();
        } catch (error: unknown) {
            messageApi.error(getErrorMessage(error, '更新探针信息失败'));
        } finally {
            setLoading(false);
        }
    };

    // 删除探针
    const handleDelete = (agent: Agent) => {
        modal.confirm({
            title: '删除探针',
            content: (
                <div>
                    <p>确定要删除探针「{agent.name || agent.hostname}」吗？</p>
                    <p className="text-red-500 text-sm mt-2">
                        警告：此操作将删除探针及其所有相关数据（指标数据、监控统计、审计结果等），且不可恢复！
                    </p>
                </div>
            ),
            okText: '确认删除',
            cancelText: '取消',
            okButtonProps: {danger: true},
            centered: true,
            onOk: async () => {
                try {
                    await deleteAgent(agent.id);
                    messageApi.success('探针删除成功');
                    actionRef.current?.reload();
                } catch (error: unknown) {
                    messageApi.error(getErrorMessage(error, '删除探针失败'));
                }
            },
        });
    };

    const columns: ProColumns<Agent>[] = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            hideInSearch: true,
            fixed: 'left',
            render: (_, record) => (
                <div className="space-y-1">
                    <div className="font-medium">{record.name || record.hostname}</div>
                    <Tag color="geekblue" bordered={false}>{record.os} · {record.arch}</Tag>
                </div>
            ),
        },
        {
            title: '平台',
            dataIndex: 'platform',
            key: 'platform',
            hideInSearch: true,
            render: (text) => text ? <Tag color="purple" bordered={false}>{text}</Tag> : '-',
        },
        {
            title: '位置',
            dataIndex: 'location',
            key: 'location',
            hideInSearch: true,
            render: (text) => text ? <Tag color="blue" bordered={false}>{text}</Tag> : '-',
        },
        {
            title: '到期时间',
            dataIndex: 'expireTime',
            key: 'expireTime',
            hideInSearch: true,
            width: 100,
            render: (val) => {
                if (!val) return '-';
                const expireDate = new Date(val as number);
                const now = new Date();
                const isExpired = expireDate < now;
                const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                return (
                    <div className="flex flex-col gap-1">
                        <div>{expireDate.toLocaleDateString('zh-CN')}</div>
                        {isExpired ? (
                            <Tag color="red" bordered={false}>已过期</Tag>
                        ) : daysLeft <= 7 ? (
                            <Tag color="orange" bordered={false}>{daysLeft}天后到期</Tag>
                        ) : daysLeft <= 30 ? (
                            <Tag color="gold" bordered={false}>{daysLeft}天后到期</Tag>
                        ) : null}
                    </div>
                );
            },
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            hideInSearch: true,
            width: 80,
            render: (_, record) => (
                <Tag color={record.status === 1 ? 'success' : 'default'}>
                    {record.status === 1 ? '在线' : '离线'}
                </Tag>
            ),
        },
        {
            title: '可见性',
            dataIndex: 'visibility',
            key: 'visibility',
            hideInSearch: true,
            width: 100,
            render: (visibility) => (
                <Tag color={visibility === 'public' ? 'green' : 'orange'}>
                    {visibility === 'public' ? '匿名可见' : '登录可见'}
                </Tag>
            ),
        },
        {
            title: '主机名',
            dataIndex: 'hostname',
            key: 'hostname',
            ellipsis: true,
            width: 150,
        },
        {
            title: 'IP 地址',
            dataIndex: 'ip',
            key: 'ip',
        },
        {
            title: '状态筛选',
            dataIndex: 'status',
            valueType: 'select',
            hideInTable: true,
            valueEnum: {
                online: {text: '在线'},
                offline: {text: '离线'},
            },
        },
        {
            title: '版本',
            dataIndex: 'version',
            key: 'version',
        },
        {
            title: '最后活跃时间',
            dataIndex: 'lastSeenAt',
            key: 'lastSeenAt',
            hideInSearch: true,
            valueType: 'dateTime',
            width: 180,
        },
        {
            title: '操作',
            key: 'action',
            valueType: 'option',
            width: 150,
            fixed: 'right',
            render: (_, record) => {
                const menuItems: MenuProps['items'] = [
                    {
                        key: 'view',
                        label: '查看详情',
                        icon: <Eye size={14}/>,
                        onClick: () => navigate(`/admin/agents/${record.id}`),
                    },
                    {
                        key: 'audit',
                        label: '安全审计',
                        icon: <Shield size={14}/>,
                        onClick: () => navigate(`/admin/agents/${record.id}?tab=audit`),
                    },
                    {
                        key: 'edit',
                        label: '编辑信息',
                        icon: <Edit size={14}/>,
                        onClick: () => handleEdit(record),
                    },
                    {
                        type: 'divider',
                    },
                    {
                        key: 'delete',
                        label: '删除探针',
                        icon: <Trash2 size={14}/>,
                        danger: true,
                        onClick: () => handleDelete(record),
                    },
                ];

                return (
                    <Space size="small">
                        <Button
                            type="link"
                            icon={<Eye size={14}/>}
                            onClick={() => navigate(`/admin/agents/${record.id}`)}
                            style={{padding: 0}}
                        >
                            详情
                        </Button>
                        <Dropdown menu={{items: menuItems}} trigger={['click']}>
                            <Button
                                type="link"
                                icon={<MoreVertical size={14}/>}
                                style={{padding: 0}}
                            />
                        </Dropdown>
                    </Space>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* 页面头部 */}
            <PageHeader
                title="探针管理"
                description="管理和监控系统探针状态"
                actions={[
                    {
                        key: 'register',
                        label: '注册探针',
                        icon: <Plus size={16}/>,
                        onClick: () => navigate('/admin/agents-install'),
                        type: 'primary',
                    },
                    {
                        key: 'refresh',
                        label: '刷新',
                        icon: <RefreshCw size={16}/>,
                        onClick: () => actionRef.current?.reload(),
                    },
                ]}
            />

            <Divider/>

            {/* 探针列表 */}
            <ProTable<Agent>
                actionRef={actionRef}
                rowKey="id"
                search={{labelWidth: 80}}
                columns={columns}
                scroll={{x: 'max-content'}}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                }}
                options={false}
                request={async (params) => {
                    const {current = 1, pageSize = 10, hostname, ip, status} = params;
                    try {
                        const response = await getAgentPaging(
                            current,
                            pageSize,
                            hostname,
                            ip,
                            status as string | undefined
                        );
                        const items = response.data.items || [];
                        return {
                            data: items,
                            success: true,
                            total: response.data.total,
                        };
                    } catch (error: unknown) {
                        messageApi.error(getErrorMessage(error, '获取探针列表失败'));
                        return {
                            data: [],
                            success: false,
                        };
                    }
                }}
            />

            {/* 编辑探针信息模态框 */}
            <Modal
                title="编辑探针信息"
                open={editModalVisible}
                onOk={handleSave}
                onCancel={() => setEditModalVisible(false)}
                confirmLoading={loading}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="名称"
                        name="name"
                        rules={[{required: true, message: '请输入探针名称'}]}
                    >
                        <Input placeholder="请输入探针名称"/>
                    </Form.Item>
                    <Form.Item
                        label="平台"
                        name="platform"
                    >
                        <Input placeholder="请输入平台信息，如：阿里云、腾讯云"/>
                    </Form.Item>
                    <Form.Item
                        label="位置"
                        name="location"
                    >
                        <Input placeholder="请输入位置信息，如：北京、香港"/>
                    </Form.Item>
                    <Form.Item
                        label="到期时间"
                        name="expireTime"
                    >
                        <DatePicker
                            style={{width: '100%'}}
                            format="YYYY-MM-DD"
                            placeholder="请选择到期时间"
                        />
                    </Form.Item>
                    <Form.Item
                        label="可见性"
                        name="visibility"
                        rules={[{required: true, message: '请选择可见性'}]}
                        extra="控制探针在公开页面的可见性"
                    >
                        <Select
                            placeholder="请选择可见性"
                            options={[
                                {label: '匿名可见', value: 'public'},
                                {label: '登录可见', value: 'private'},
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AgentList;
