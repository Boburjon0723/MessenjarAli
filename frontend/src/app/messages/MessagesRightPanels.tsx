'use client';

import React from 'react';
import ExpertActionsPanel from '@/components/chat/ExpertActionsPanel';
import ChannelInfoPanel from '@/components/chat/ChannelInfoPanel';
import UserInfoPanel from '@/components/chat/UserInfoPanel';
import GroupInfoPanel from '@/components/chat/GroupInfoPanel';

export type MessagesRightPanelsProps = {
    showRightPanel: boolean;
    activeCategory: string;
    selectedExpertInView: any;
    selectedChat: any;
    onCloseRightPanel: () => void;
    onChatDeleted: () => void;
    onChatLeft: () => void;
    onGroupUpdated: () => void;
    onChatNotFound: () => void;
};

export function MessagesRightPanels({
    showRightPanel,
    activeCategory,
    selectedExpertInView,
    selectedChat,
    onCloseRightPanel,
    onChatDeleted,
    onChatLeft,
    onGroupUpdated,
    onChatNotFound,
}: MessagesRightPanelsProps) {
    return (
        <>
            {showRightPanel && activeCategory === 'services' && selectedExpertInView ? (
                <aside className="hidden lg:flex fixed lg:relative inset-0 lg:inset-auto z-[110] lg:z-0 xl:flex w-80 h-full min-h-0 flex-shrink-0 flex-col overflow-hidden animate-slide-left">
                    <ExpertActionsPanel expert={selectedExpertInView} onClose={onCloseRightPanel} />
                </aside>
            ) : null}

            {selectedChat ? (
                <aside
                    aria-hidden={!showRightPanel}
                    className={[
                        'fixed lg:relative inset-0 lg:inset-auto z-[200] lg:z-0 h-full min-h-0 w-80 flex-shrink-0 overflow-hidden isolate max-lg:bg-transparent max-lg:w-full',
                        showRightPanel ? 'flex flex-col chat-info-panel-enter' : 'hidden',
                    ].join(' ')}
                >
                    {selectedChat?.type === 'channel' ? (
                        <ChannelInfoPanel chat={selectedChat} onClose={onCloseRightPanel} />
                    ) : selectedChat?.type === 'private' ? (
                        <UserInfoPanel chat={selectedChat} onClose={onCloseRightPanel} />
                    ) : (
                        <GroupInfoPanel
                            chat={selectedChat}
                            onClose={onCloseRightPanel}
                            onDeleted={onChatDeleted}
                            onLeft={onChatLeft}
                            onGroupUpdated={onGroupUpdated}
                            onChatNotFound={onChatNotFound}
                        />
                    )}
                </aside>
            ) : null}
        </>
    );
}

export default MessagesRightPanels;
