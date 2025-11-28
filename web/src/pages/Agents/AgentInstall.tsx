import React, {type ReactElement, useEffect, useState} from 'react';
import {Alert, App, Button, Card, Select, Space, Tabs, Typography} from 'antd';
import {CopyIcon} from 'lucide-react';
import {listApiKeys} from '../../api/apiKey';
import type {ApiKey} from '../../types';
import linuxPng from '../../assets/os/linux.png';
import applePng from '../../assets/os/apple.png';
import windowsPng from '../../assets/os/win11.png';
import {useNavigate} from "react-router-dom";

const {Paragraph, Text} = Typography;
const {TabPane} = Tabs;

interface OSConfig {
    name: string;
    icon: ReactElement;
    downloadUrl: string;
}

const AgentInstall = () => {
    const [selectedOS, setSelectedOS] = useState<string>('linux-amd64');
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [selectedApiKey, setSelectedApiKey] = useState<string>('');

    const {message} = App.useApp();
    const serverUrl = window.location.origin;
    let navigate = useNavigate();

    // 加载API密钥列表
    useEffect(() => {
        const fetchApiKeys = async () => {
            try {
                const keys = await listApiKeys();
                const enabledKeys = keys.data?.items.filter(k => k.enabled);
                setApiKeys(enabledKeys);
                if (enabledKeys.length > 0) {
                    setSelectedApiKey(enabledKeys[0].key);
                }
            } catch (error) {
                console.error('Failed to load API keys:', error);
            }
        };
        fetchApiKeys();
    }, []);

    const osConfigs: Record<string, OSConfig> = {
        'linux-amd64': {
            name: 'Linux (amd64)',
            icon: <img src={linuxPng} alt="Linux" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-linux-amd64',
        },
        'linux-arm64': {
            name: 'Linux (arm64)',
            icon: <img src={linuxPng} alt="Linux" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-linux-arm64',
        },
        'linux-loong64': {
            name: 'Linux (loongarch64)',
            icon: <img src={linuxPng} alt="Linux" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-linux-loong64',
        },
        'darwin-amd64': {
            name: 'macOS (intel)',
            icon: <img src={applePng} alt="macOS" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-darwin-amd64',
        },
        'darwin-arm64': {
            name: 'macOS (arm64)',
            icon: <img src={applePng} alt="macOS" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-darwin-arm64',
        },
        'windows-amd64': {
            name: 'Windows (amd64)',
            icon: <img src={windowsPng} alt="Windows" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-windows-amd64.exe',
        },
        'windows-arm64': {
            name: 'Windows (arm64)',
            icon: <img src={windowsPng} alt="Windows" className={'h-4 w-4'}/>,
            downloadUrl: '/api/agent/downloads/agent-windows-arm64.exe',
        },
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('已复制到剪贴板');
    };

    // 获取一键安装命令
    const getInstallCommand = () => {
        // Linux/macOS 使用一键安装脚本
        return `curl -fsSL ${serverUrl}/api/agent/install.sh?token=${selectedApiKey} | sudo bash`;
    };

    const ApiChooser = () => {
        return <Card type={'inner'} title={'选择 API Token'}>
            <Space direction="vertical" className="w-full">
                {apiKeys.length === 0 ? (
                    <Alert
                        message="暂无可用的 API Token"
                        description={
                            <span>
                                请先前往 <a href="/admin/api-keys">API密钥管理</a> 页面生成一个 API Token
                            </span>
                        }
                        type="warning"
                        showIcon
                        className="mt-2"
                    />
                ) : (
                    <Select
                        className="w-full mt-2"
                        value={selectedApiKey}
                        onChange={setSelectedApiKey}
                        options={apiKeys.map(key => ({
                            label: `${key.name} (${key.key.substring(0, 8)}...)`,
                            value: key.key,
                        }))}
                    />
                )}
            </Space>
        </Card>
    }

    const InstallByOneClick = () => {
        return <Space direction={'vertical'} className={'w-full'}>
            <ApiChooser/>
            <Alert
                description={'一键安装脚本仅支持 Linux/macOS 系统。'}
                type="info"
                showIcon
                className="mt-2"
            />
            <Card type="inner" title="一键安装">
                <Paragraph type="secondary" className="mb-3">
                    脚本会自动检测系统架构并下载对应版本的探针，然后完成注册和安装。
                </Paragraph>
                <pre className="m-0 overflow-auto text-sm">
                                    <code>{getInstallCommand()}</code>
                                </pre>
                <Button
                    type={'link'}
                    onClick={() => {
                        copyToClipboard(getInstallCommand());
                    }}
                    icon={<CopyIcon className={'h-4 w-4'}/>}
                    style={{margin: 0, padding: 0}}
                >
                    复制命令
                </Button>
            </Card>

            <ServiceHelper os={'pika-agent'}/>
            <ConfigHelper/>
        </Space>
    }

    const ServiceHelper = ({os}: { os: string }) => {
        return <Card type="inner" title="服务管理命令">
            <Paragraph type="secondary" className="mb-3">
                注册完成后，您可以使用以下命令管理探针服务：
            </Paragraph>
            <pre className="m-0 overflow-auto text-sm">
                <code>{getCommonCommands(os)}</code>
            </pre>
        </Card>
    }

    const ConfigHelper = () => {
        return <Card type="inner" title="配置文件说明">
            <Paragraph>
                注册完成后，配置文件会保存在:
            </Paragraph>
            <ul className="space-y-2">
                <li>
                    <Text code>~/.pika/agent.yaml</Text> - 配置文件路径
                </li>
                <li>
                    您可以手动编辑此文件来修改配置，修改后需要重启服务生效
                </li>
            </ul>
        </Card>
    }

    // 获取手动安装步骤
    const getManualInstallSteps = (os: string) => {
        const token = selectedApiKey;
        const config = osConfigs[os];

        if (os.startsWith('windows')) {
            const agentName = 'pika-agent.exe';
            return [
                {
                    title: '1. 下载探针',
                    command: `# 使用 PowerShell 下载
Invoke-WebRequest -Uri "${serverUrl}${config.downloadUrl}" -OutFile "${agentName}"

# 或者使用浏览器直接下载
# ${serverUrl}${config.downloadUrl}`
                },
                {
                    title: '2. 注册探针',
                    command: `.\\${agentName} register --endpoint "${serverUrl}" --token "${token}"`
                },
                {
                    title: '3. 验证安装',
                    command: `.\\${agentName} status`
                }
            ];
        } else {
            const agentName = 'pika-agent';

            return [
                {
                    title: '1. 下载探针',
                    command: `# 使用 wget 下载
wget ${serverUrl}${config.downloadUrl} -O ${agentName}

# 或使用 curl 下载
curl -L ${serverUrl}${config.downloadUrl} -o ${agentName}`
                },
                {
                    title: '2. 赋予执行权限',
                    command: `chmod +x ${agentName}`
                },
                {
                    title: '3. 移动到系统路径',
                    command: `sudo mv ${agentName} /usr/local/bin/${agentName}`
                },
                {
                    title: '4. 注册探针',
                    command: `sudo ${agentName} register --endpoint "${serverUrl}" --token "${token}"`
                },
                {
                    title: '5. 验证安装',
                    command: `sudo ${agentName} status`
                }
            ];
        }
    };

    const InstallByManual = () => {
        return <Space direction={'vertical'} className={'w-full'}>
            <ApiChooser/>
            <Tabs
                activeKey={selectedOS}
                onChange={setSelectedOS}
                size="large"
            >
                {Object.entries(osConfigs).map(([key, config]) => (
                    <TabPane
                        tab={
                            <div className={'flex items-center gap-2'}>
                                {config.icon}
                                <span>{config.name}</span>
                            </div>
                        }
                        key={key}
                    >
                        <Space direction={'vertical'} className={'w-full'}>

                            {/* 手动安装步骤 */}
                            <Card type="inner" title="手动安装步骤">
                                <Space direction="vertical" className="w-full" size="middle">
                                    {getManualInstallSteps(key).map((step, index) => (
                                        <div key={index}>
                                            <Text strong className="block mb-2">{step.title}</Text>
                                            <pre className="m-0 overflow-auto text-sm bg-gray-50 p-3 rounded">
                                                <code>{step.command}</code>
                                            </pre>
                                            <Button
                                                type={'link'}
                                                onClick={() => {
                                                    copyToClipboard(step.command);
                                                }}
                                                icon={<CopyIcon className={'h-4 w-4'}/>}
                                                size="small"
                                                style={{margin: 0, padding: 0}}
                                            >
                                                复制
                                            </Button>
                                        </div>
                                    ))}
                                </Space>
                            </Card>

                            <ServiceHelper os={key}/>
                            <ConfigHelper/>
                        </Space>
                    </TabPane>
                ))}
            </Tabs>
        </Space>
    }

    // 常用命令
    const getCommonCommands = (os: string) => {
        const agentCmd = os.startsWith('windows') ? '.\\pika-agent.exe' : 'pika-agent';
        const sudo = os.startsWith('windows') ? '' : 'sudo ';

        return `# 查看服务状态
${sudo}${agentCmd} status

# 停止服务
${sudo}${agentCmd} stop

# 启动服务
${sudo}${agentCmd} start

# 重启服务
${sudo}${agentCmd} restart

# 卸载服务
${sudo}${agentCmd} uninstall

# 查看版本
${agentCmd} version`;
    };

    return (
        <Space direction={'vertical'}>

            <div className="flex gap-2 items-center">
                <div className="text-sm cursor-pointer hover:underline"
                     onClick={() => navigate(-1)}
                >返回 |
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">探针部署指南</h1>
            </div>

            <Tabs
                style={{
                    marginTop: 24,
                }}
                tabPosition={'left'}
                items={[
                    {
                        label: '一键安装',
                        key: 'one-click',
                        children: <InstallByOneClick/>
                    },
                    {
                        label: '手动安装',
                        key: 'manual',
                        children: <InstallByManual/>
                    },
                ]}
            />


        </Space>
    );
};

export default AgentInstall;
