<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AI Chat - itsLaravel13Setup</title>
    <script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"></script>
    <script>
        // Fallback markdown parser if marked.js doesn't load
window.markedFallback = function(text) {
    if (!text) return '';
    // Escape HTML first
    let html = text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    
    // Collapse excessive newlines to prevent too much spacing
    html = html.replace(/\n{3,}/g, '\n\n');
    
    // Handle lists: collect consecutive lines starting with - or *
    let result = '';
    let lines = html.split(/\n/);
    let inList = false;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            if (inList && listItems.length > 0) {
                result += '<ul>' + listItems.map(item => '<li>' + item + '</li>').join('') + '</ul>\n';
                listItems = [];
                inList = false;
            }
            continue;
        }
        
        if (line.match(/^[-*] /)) {
            let itemContent = line.replace(/^[-*] /, '');
            // Process inline markdown for list items
            itemContent = itemContent
                .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>');
            listItems.push(itemContent);
            inList = true;
        } else {
            if (inList && listItems.length > 0) {
                result += '<ul>' + listItems.map(item => '<li>' + item + '</li>').join('') + '</ul>\n';
                listItems = [];
                inList = false;
            }
            
            let inline = line
                .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/^### (.+)$/, '<h3>$1</h3>')
                .replace(/^## (.+)$/, '<h2>$1</h2>')
                .replace(/^# (.+)$/, '<h1>$1</h1>');
            result += '<p>' + inline + '</p>\n';
        }
    }
    
    if (inList && listItems.length > 0) {
        result += '<ul>' + listItems.map(item => '<li>' + item + '</li>').join('') + '</ul>\n';
    }
    
    return result;
};

if (typeof marked === 'undefined') {
    marked = { parse: window.markedFallback };
}
</script>
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/themes.css'])
    @endif
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary); 
            height: 100vh; 
            display: flex;
            flex-direction: column;
            color: var(--text-primary);
            transition: background 0.3s, color 0.3s;
        }
        
        .header { 
            background: var(--header-bg); 
            color: white; 
            padding: 0.875rem 1.5rem; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            flex-shrink: 0;
            box-shadow: 0 2px 20px var(--shadow-color);
        }
        .header h1 { font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .header h1 .chat-title-text { color: rgba(255,255,255,0.9); font-weight: 400; }
        .header h1 .chat-title-text::before { content: '•'; margin: 0 0.5rem; opacity: 0.5; }
        .header-actions { display: flex; gap: 0.5rem; }
        .header-btn, .theme-toggle {
            background: rgba(255,255,255,0.15);
            color: white;
            border: none;
            padding: 0.4rem 0.875rem;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.8rem;
            text-decoration: none;
            transition: all 0.2s;
        }
        .header-btn:hover, .theme-toggle:hover { background: rgba(255,255,255,0.25); }
        
        .main-container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .sidebar {
            width: 320px;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--sidebar-border);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            transition: width 0.3s ease, min-width 0.3s ease, background 0.3s, border-color 0.3s;
            overflow: hidden;
        }
        .sidebar.minimized {
            width: 0;
            min-width: 0;
            border-right: none;
        }
        .sidebar-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.15);
            border: none;
            border-radius: 8px;
            padding: 0.4rem 0.5rem;
            cursor: pointer;
            color: white;
            font-size: 0.8rem;
            transition: all 0.2s;
        }
        .sidebar-toggle:hover { background: rgba(255,255,255,0.25); }
        .sidebar-minimized .sidebar-toggle,
        .sidebar-toggle.visible { display: flex; }
        .sidebar-toggle-icon { transition: transform 0.3s; }
        .sidebar-minimized .sidebar-toggle .sidebar-toggle-icon { transform: rotate(180deg); }
        .sidebar-header {
            padding: 0.75rem;
            border-bottom: 1px solid var(--sidebar-border);
        }
        .new-chat-btn {
            width: 100%;
            padding: 0.7rem;
            background: var(--accent-gradient);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            transition: all 0.2s;
            box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
        }
        .new-chat-btn:hover { 
            transform: translateY(-1px); 
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); 
        }
        
        .chat-list { flex: 1; overflow-y: auto; padding: 0.5rem; }
        .chat-list::-webkit-scrollbar { width: 4px; }
        .chat-list::-webkit-scrollbar-track { background: var(--scrollbar-track); }
        .chat-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 2px; }
        
        /* Sidebar Footer */
        .sidebar-footer {
            padding: 0.75rem 1.5rem;
            background: var(--sidebar-bg);
            border-top: 1px solid var(--sidebar-border);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
            transition: background 0.3s, border-color 0.3s;
        }
        .sidebar-footer .user-avatar {
            width: 36px;
            height: 36px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
            flex-shrink: 0;
        }
        .sidebar-footer .user-details { flex: 1; min-width: 0; }
        .sidebar-footer .user-name { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-footer .user-email { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .chat-item {
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
            border-radius: 10px;
            margin-bottom: 0.35rem;
            border: 1px solid transparent;
            background: transparent;
        }
        .chat-item:hover { 
            background: var(--chat-item-hover);
            border-color: var(--accent-primary);
        }
        .chat-item.active { 
            background: var(--chat-item-active);
            border-color: var(--accent-primary);
        }
        
        .chat-item-header {
            display: flex;
            align-items: flex-start;
            gap: 0.6rem;
            margin-bottom: 0.35rem;
        }
        .chat-item-icon {
            width: 32px;
            height: 32px;
            background: var(--accent-gradient);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            flex-shrink: 0;
        }
        .chat-item-content { flex: 1; min-width: 0; }
        .chat-item-title { 
            font-size: 0.85rem; 
            color: var(--text-primary); 
            font-weight: 500;
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            margin-bottom: 0.2rem;
        }
        .chat-item-preview {
            font-size: 0.7rem; 
            color: var(--text-muted); 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis;
            line-height: 1.3;
        }
        .chat-item-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 0.35rem;
            padding-left: calc(32px + 0.6rem);
        }
        .chat-item-date { 
            font-size: 0.65rem; 
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 0.2rem;
        }
        .chat-item-delete {
            color: var(--text-muted);
            font-size: 0.8rem;
            cursor: pointer;
            padding: 0.25rem 0.4rem;
            border-radius: 4px;
            opacity: 0;
            transition: all 0.2s;
            flex-shrink: 0;
        }
        .chat-item:hover .chat-item-delete { opacity: 1; }
        .chat-item-delete:hover { color: var(--error-color); background: var(--error-bg); }
        
        .no-chats, .no-results {
            padding: 3rem 1.5rem;
            text-align: center;
            color: var(--text-muted);
        }
        .no-chats-icon, .no-results-icon { font-size: 3rem; margin-bottom: 1rem; }
        .no-chats p, .no-results p { font-size: 0.9rem; line-height: 1.6; }
        .hidden { display: none !important; }
        
        /* Chat Area */
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
            transition: background 0.3s;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 0.75rem 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        .chat-messages::-webkit-scrollbar { width: 6px; }
        .chat-messages::-webkit-scrollbar-track { background: var(--scrollbar-track); }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
        
        .message { 
            display: flex; 
            flex-direction: column; 
            max-width: 80%; 
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .message.user { align-self: flex-end; align-items: flex-end; }
        .message.assistant { align-self: flex-start; align-items: flex-start; }
        
        .message-bubble {
            padding: 0.6rem 0.875rem;
            border-radius: 14px;
            line-height: 1.4;
            word-wrap: break-word;
            font-size: 0.9rem;
            white-space: pre-wrap;
        }
        .message.user .message-bubble {
            background: var(--message-user-bg);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .message.assistant .message-bubble {
            background: var(--message-assistant-bg);
            color: var(--text-primary);
            border-bottom-left-radius: 4px;
            border: 1px solid var(--message-assistant-border);
            transition: background 0.3s, border-color 0.3s, color 0.3s;
        }
        
        /* Markdown styling in messages */
        .message-bubble h1, .message-bubble h2, .message-bubble h3 { color: var(--text-primary); margin: 0.3em 0 0.15em 0; font-weight: 600; }
        .message-bubble h1 { font-size: 1.15em; }
        .message-bubble h2 { font-size: 1.05em; }
        .message-bubble h3 { font-size: 1em; }
        .message-bubble p { margin: 0.05em 0 !important; line-height: 1.25 !important; }
        .message-bubble ul, .message-bubble ol { margin: 0.05em 0 !important; line-height: 1.25 !important; }
        .message-bubble h1, .message-bubble h2, .message-bubble h3 { margin: 0.08em 0 !important; line-height: 1.25 !important; }
        .message-bubble pre, .message-bubble blockquote, .message-bubble table, .message-bubble hr { margin: 0.05em 0 !important; line-height: 1.25 !important; }
        .message-bubble p:last-child { margin-bottom: 0; }
        .message-bubble ul, .message-bubble ol { margin: 0.2em 0; padding-left: 1.5em; }
        .message-bubble li { margin: 0.2em 0; line-height: 1.45; }
        .message-bubble li > ul, .message-bubble li > ol { margin: 0.1em 0; }
        .message-bubble code { 
            background: var(--bg-tertiary); 
            padding: 0.15em 0.4em; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.88em;
            color: var(--text-primary);
        }
        .message-bubble pre { 
            background: var(--bg-tertiary); 
            padding: 0.5em 0.75em; 
            border-radius: 6px; 
            overflow-x: auto;
            margin: 0.3em 0;
        }
        .message-bubble pre code { background: none; padding: 0; font-size: 0.85em; }
        .message-bubble strong { font-weight: 600; color: var(--text-primary); }
        .message-bubble em { font-style: italic; color: var(--text-secondary); }
        .message-bubble a { color: var(--accent-primary); text-decoration: none; }
        .message-bubble a:hover { text-decoration: underline; }
        .message-bubble blockquote {
            border-left: 3px solid var(--accent-primary);
            padding-left: 1em;
            margin: 0.4em 0;
            color: var(--text-secondary);
            font-style: italic;
        }
        .message-bubble hr {
            border: none;
            border-top: 1px solid var(--border-secondary);
            margin: 0.6em 0;
        }
        .message-bubble table {
            border-collapse: collapse;
            margin: 0.4em 0;
            width: 100%;
            font-size: 0.9em;
        }
        .message-bubble th, .message-bubble td {
            border: 1px solid var(--border-secondary);
            padding: 0.5em 0.75em;
            text-align: left;
        }
        .message-bubble th { background: var(--chat-item-hover); font-weight: 500; }
        .message-bubble tr:nth-child(even) { background: var(--hover-overlay); }
        
        .message-time { 
            font-size: 0.65rem; 
            color: var(--text-muted); 
            margin-top: 0.3rem;
            padding: 0 0.4rem;
        }
        
        .welcome {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            padding: 2rem;
        }
        .welcome-icon { font-size: 4rem; margin-bottom: 1.5rem; }
        .welcome h2 { color: var(--text-primary); margin-bottom: 0.75rem; font-size: 1.75rem; font-weight: 600; }
        .welcome p { color: var(--text-secondary); max-width: 450px; line-height: 1.7; font-size: 1rem; }
        
        /* Input Area */
        .input-area {
            padding: 1rem 1.5rem;
            background: var(--sidebar-bg);
            border-top: 1px solid var(--sidebar-border);
            flex-shrink: 0;
            transition: background 0.3s, border-color 0.3s;
        }
        .input-container {
            display: flex;
            gap: 0.75rem;
            max-width: 900px;
            margin: 0 auto;
            align-items: flex-end;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.5rem;
            background: var(--sidebar-bg);
            border-top: 1px solid var(--sidebar-border);
            flex-shrink: 0;
            transition: background 0.3s, border-color 0.3s;
        }
        .user-avatar {
            width: 36px;
            height: 36px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
            flex-shrink: 0;
        }
        .user-details { flex: 1; min-width: 0; }
        .user-name { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-email { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .agent-selector {
            width: 200px;
            position: relative;
            flex-shrink: 0;
        }
        .agent-selector-trigger {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0 1rem;
            background: var(--bg-input);
            border: 2px solid var(--border-secondary);
            border-radius: 14px;
            font-size: 0.9rem;
            color: var(--text-primary);
            cursor: pointer;
            width: 200px;
            height: 46px;
            box-sizing: border-box;
            transition: all 0.2s;
            overflow: hidden;
        }
        .agent-selector-trigger:hover {
            border-color: var(--accent-primary);
        }
        .agent-selector-trigger.open {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        .agent-selector-trigger svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        .agent-selector-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: inline-block;
        }
        .agent-selector-dropdown {
            position: absolute;
            bottom: 100%;
            left: 0;
            margin-bottom: 0.5rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-secondary);
            border-radius: 12px;
            overflow: hidden;
            display: none;
            z-index: 100;
            box-shadow: 0 4px 20px var(--shadow-color);
            width: 200px;
        }
        .agent-selector-dropdown.open {
            display: block;
        }
        .agent-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            /* padding: 0.75rem 1rem; */
            cursor: pointer;
            transition: background 0.2s;
            color: var(--text-primary);
        }
        .agent-option:hover {
            background: var(--chat-item-hover);
        }
        .agent-option.selected {
            background: var(--chat-item-active);
        }
        .agent-option svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        .agent-option-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .agent-option-check {
            color: var(--accent-primary);
            font-size: 1.2rem;
        }
        .chat-input {
            flex: 1;
            padding: 0 1rem;
            background: var(--bg-input);
            border: 2px solid var(--border-secondary);
            border-radius: 14px;
            font-size: 0.9rem;
            resize: none;
            min-height: 46px;
            max-height: 150px;
            font-family: inherit;
            color: var(--text-primary);
            transition: all 0.2s;
            line-height: 1.4;
            overflow-wrap: break-word;
            word-break: break-word;
            box-sizing: border-box;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--scrollbar-thumb) transparent;
        }
        .chat-input:focus { 
            outline: none; 
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
        .chat-input::placeholder { color: var(--text-muted); }
        .chat-input::-webkit-scrollbar { width: 4px; }
        .chat-input::-webkit-scrollbar-track { background: var(--scrollbar-track); }
        .chat-input::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 2px; }
        
        .new-chat-btn.disabled,
        .send-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .send-btn {
            width: 46px;
            height: 46px;
            background: var(--accent-gradient);
            color: white;
            border: 2px solid transparent;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.1rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            flex-shrink: 0;
            box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
            flex-shrink: 0;
        }
        .send-btn:hover { 
            transform: scale(1.05); 
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); 
        }
        .send-btn:disabled { 
            opacity: 0.5; 
            cursor: not-allowed; 
            transform: none; 
        }
        
        .attachment-btn {
            width: 46px;
            height: 46px;
            background: var(--bg-input);
            color: var(--text-secondary);
            border: 2px solid var(--border-secondary);
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.1rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            flex-shrink: 0;
        }
        .attachment-btn:hover {
            border-color: var(--accent-primary);
            color: var(--accent-primary);
        }
        .attachment-btn.has-files {
            color: var(--accent-primary);
            border-color: var(--accent-primary);
        }
        .attachment-input {
            display: none;
        }
        .attachment-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-secondary);
        }
        .attachment-preview-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.4rem 0.6rem;
            background: var(--bg-input);
            border-radius: 6px;
            font-size: 0.75rem;
            color: var(--text-primary);
        }
        .attachment-preview-item .remove-btn {
            cursor: pointer;
            color: var(--text-muted);
            font-size: 0.9rem;
            line-height: 1;
        }
        .attachment-preview-item .remove-btn:hover {
            color: var(--error-color);
        }
        .attachment-preview-image {
            position: relative;
            padding: 0.3rem;
            flex-direction: column;
            align-items: flex-start;
        }
        .attachment-preview-image img {
            width: 80px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
            display: block;
        }
        .attachment-preview-image .attachment-name {
            font-size: 0.65rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
            max-width: 80px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .attachment-preview-image .remove-btn {
            position: absolute;
            top: 0.15rem;
            right: 0.15rem;
            background: rgba(0,0,0,0.5);
            border-radius: 50%;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.6rem;
            color: #fff;
        }
        .attachment-preview-image .remove-btn:hover {
            background: var(--error-color);
            color: #fff;
        }
        
        /* Message attachment styling */
        .message-attachments {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .message-attachment {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            padding: 0.5rem;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-secondary);
        }
        .message-attachment.image-attachment img {
            display: block;
        }
        .message-attachment .attachment-name {
            font-size: 0.7rem;
            color: var(--text-muted);
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .message-attachment.file-attachment {
            flex-direction: row;
            align-items: center;
            gap: 0.5rem;
        }
        .message-attachment .attachment-icon {
            font-size: 1.2rem;
        }
        
        /* Error message styling */
        .error-message {
            background: var(--error-bg);
            color: var(--error-color);
            padding: 0.875rem 1.25rem;
            border-radius: 12px;
            margin: 1rem 2rem;
            font-size: 0.9rem;
            text-align: center;
            border: 1px solid var(--error-border);
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -320px;
                top: 0;
                bottom: 0;
                z-index: 1000;
                transition: left 0.3s;
                width: 90%;
                max-width: 320px;
            }
            .sidebar.open { left: 0; }
            .sidebar.minimized { width: 0; max-width: 0; }
            .sidebar-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
                z-index: 999;
            }
            .sidebar.open + .sidebar-overlay { display: block; }
            .mobile-menu-btn { display: flex !important; }
            .message { max-width: 92%; }
            .header h1 span { display: none; }
            .chat-messages { padding: 1rem; }
            .input-area { padding: 1rem; }
            .input-container { flex-wrap: wrap; }
            .agent-selector { width: 100%; margin-bottom: 0.5rem; }
            .agent-selector-trigger { height: 46px; width: 100%; }
            .agent-selector-dropdown { position: static; margin-bottom: 0.5rem; border-radius: 8px; }
            .chat-input { min-height: 46px; }
            .chat-bubble { font-size: 0.9rem; }
            .sidebar-toggle { display: flex !important; }
            .user-info { padding: 0.5rem 1rem; }
        }
        
        @media (min-width: 769px) {
            .mobile-menu-btn { display: none !important; }
        }
        
        /* Thinking indicator */
        .typing-indicator {
            display: flex;
            gap: 0.35rem;
            padding: 1rem 1.25rem;
            background: var(--message-assistant-bg);
            border-radius: 18px;
            align-self: flex-start;
            border: 1px solid var(--message-assistant-border);
        }
        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: var(--typing-dot);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button class="sidebar-toggle visible" id="sidebarToggle" onclick="toggleSidebarMinimize()" title="Toggle sidebar">
                <span class="sidebar-toggle-icon">◀</span>
            </button>
            <button class="header-btn mobile-menu-btn" onclick="toggleSidebar()" style="display: none;">☰</button>
            <h1><span>🤖</span> <span id="headerTitle">AI Chat</span><span class="chat-title-text" id="chatTitleHeader" style="display:none;"></span></h1>
        </div>
        <div class="header-actions">
            <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme" id="themeToggle">
                <svg id="themeIconLight" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <svg id="themeIconDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <a href="/profile" class="header-btn">👤 Profile</a>
            <a href="/settings" class="header-btn">👤 Account</a>
            <a href="/ai-agents" class="header-btn">🤖 AI Agents</a>
            @if(auth()->check() && auth()->user()->is_admin)
                <a href="/admin" class="header-btn" style="background: rgba(231,76,60,0.3);">🔧 Admin</a>
            @endif
            <form action="/logout" method="POST" style="display:inline;">
                @csrf
                <button type="submit" class="header-btn">Logout</button>
            </form>
        </div>
    </div>
    
    <div class="main-container">
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    @if(!$aiConfigured)
                        <button type="button" class="new-chat-btn disabled" disabled title="Please configure your AI provider first in Settings" style="flex:1;">✨ New Chat</button>
                    @else
                        <form action="/chat" method="GET" style="flex:1;">
                            <button type="submit" class="new-chat-btn">✨ New Chat</button>
                        </form>
                    @endif
                </div>
                <div style="margin-top: 0.5rem;">
                    <input type="text" id="chatSearch" placeholder="🔍 Search chats..." onkeyup="filterChats()" style="width: 100%; padding: 0.5rem 0.75rem; background: #252542; border: 1px solid #3a3a5a; border-radius: 8px; color: #fff; font-size: 0.8rem; outline: none; box-sizing: border-box;">
                </div>
            </div>
            <div class="sidebar-footer">
                <div class="user-avatar">{{ substr(auth()->user()->name, 0, 1) }}</div>
                <div class="user-details">
                    <div class="user-name">{{ auth()->user()->name }}</div>
                    <div class="user-email">{{ auth()->user()->email }}</div>
                </div>
            </div>
            <div class="chat-list" id="chatList">
                @forelse($chats as $c)
                    <div class="chat-item {{ isset($chat) && $chat->id == $c->id ? 'active' : '' }}" onclick="window.location.href='/chat/{{ $c->id }}'" data-title="{{ strtolower($c->title) }}">
                        <div class="chat-item-header">
                            <div class="chat-item-icon">💬</div>
                            <div class="chat-item-content">
                                <div class="chat-item-title">{{ $c->title }}</div>
                                @php $lastMsg = $c->messages->last(); @endphp
                                @if($lastMsg)
                                    <div class="chat-item-preview">{{ Str::limit(strip_tags($lastMsg->message), 60) }}</div>
                                @endif
                            </div>
                        </div>
                        <div class="chat-item-footer">
                            <span class="chat-item-date">📅 {{ $c->created_at->format('M j, Y') }}</span>
                            <span class="chat-item-delete" onclick="event.stopPropagation(); if(confirm('Delete this chat?')) { document.getElementById('delete-form-{{ $c->id }}').submit(); }">🗑️</span>
                        </div>
                        <form id="delete-form-{{ $c->id }}" action="/chat/{{ $c->id }}" method="POST" style="display:none;">
                            @csrf
                            @method('DELETE')
                        </form>
                    </div>
                @empty
                    <div class="no-chats" id="noChatsMessage">
                        <div class="no-chats-icon">💬</div>
                        <p>No conversations yet.<br>Start chatting with AI!</p>
                    </div>
                @endforelse
                <div class="no-results hidden" id="noResultsMessage">
                    <div class="no-results-icon">🔍</div>
                    <p>No chats found matching<br>your search.</p>
                </div>
            </div>
        </div>
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
        
        <div class="chat-area">
            @if(session('error'))
                <div class="error-message">{{ session('error') }}</div>
            @endif
            
            @if(isset($chat) && $chat)
                <div class="chat-messages" id="chatMessages">
                    @foreach($chat->messages as $message)
                        <div class="message {{ $message->role }}" data-id="{{ $message->id }}">
                            @php
                                $attachments = $message->attachments ? json_decode($message->attachments, true) : [];
                            @endphp
                            @if(!empty($attachments))
                                <div class="message-attachments">
                                    @foreach($attachments as $attachment)
                                        @if(isset($attachment['mime']) && strpos($attachment['mime'], 'image/') === 0)
                                            <div class="message-attachment image-attachment">
                                                <img src="{{ route('attachment.show', ['userId' => auth()->id(), 'filename' => basename($attachment['path'])]) }}" alt="{{ $attachment['name'] }}" style="max-width: 300px; max-height: 200px; border-radius: 8px;" />
                                                <span class="attachment-name">{{ $attachment['name'] }}</span>
                                            </div>
                                        @elseif(isset($attachment['mime']))
                                            <div class="message-attachment file-attachment">
                                                <span class="attachment-icon">📎</span>
                                                <span class="attachment-name">{{ $attachment['name'] }}</span>
                                            </div>
                                        @endif
                                    @endforeach
                                </div>
                            @endif
                            <div class="message-bubble">{{ $message->message }}</div>
                            <div class="message-time">{{ $message->created_at->format('g:i A') }}</div>
                        </div>
                    @endforeach
                </div>
            @else
                <div class="welcome">
                    <div class="welcome-icon">🤖</div>
                    <h2>Welcome to AI Chat</h2>
                    <p>Ask me anything! I can help with coding, writing, analysis, answering questions, and more.</p>
                </div>
                <div class="chat-messages" id="chatMessages" style="display:none;"></div>
            @endif
            
            <div class="user-info">
                <div class="user-avatar">{{ substr(auth()->user()->name, 0, 1) }}</div>
                <div class="user-details">
                    <div class="user-name">{{ auth()->user()->name }}</div>
                    <div class="user-email">{{ auth()->user()->email }}</div>
                </div>
            </div>
            <div class="input-area">
                <form id="chatForm" action="{{ isset($chat) ? '/chat/' . $chat->id : '/chat' }}" method="POST" onsubmit="return handleSubmit();">
                    @csrf
                    <div class="input-container">
                        @if($aiAgents->count() > 0)
                            <div class="agent-selector" id="agentSelector">
                                <div class="agent-selector-trigger" onclick="toggleAgentDropdown()">
                                    <span id="selectedAgentIcon">{!! App\Models\AiAgent::getProviderIcon($aiAgents->first()->provider) !!}</span>
                                    <span id="selectedAgentName" class="agent-selector-name" title="{{ $aiAgents->first()->name }}">{{ $aiAgents->first()->name }}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" style="margin-left: auto; flex-shrink: 0;"><path fill="#888" d="M6 8L1 3h10z"/></svg>
                                </div>
                                <div class="agent-selector-dropdown" id="agentDropdown">
                                    @foreach($aiAgents as $agent)
                                        <div class="agent-option {{ $agent->is_default ? 'selected' : '' }}" data-agent-id="{{ $agent->id }}" data-provider="{{ $agent->provider }}" data-icon="{{ addslashes(App\Models\AiAgent::getProviderIcon($agent->provider)) }}" data-name="{{ addslashes($agent->name) }}" onclick="selectAgentFromElement(this)">
                                            {!! App\Models\AiAgent::getProviderIcon($agent->provider) !!}
                                            <span class="agent-option-name">{{ $agent->name }}</span>
                                            @if($agent->is_default)
                                                <span class="agent-option-check">✓</span>
                                            @endif
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        @endif
                        @if(!$aiConfigured && $aiAgents->count() == 0)
                            <textarea 
                                class="chat-input" 
                                id="chatInput" 
                                name="message" 
                                placeholder="Please configure AI settings first..." 
                                rows="1"
                                disabled
                            ></textarea>
                            <button type="button" class="send-btn disabled" id="sendBtn" disabled title="Please configure your AI provider in Settings">➤</button>
                        @else
                            <button type="button" class="attachment-btn" id="attachmentBtn" title="Attach files">📎</button>
                            <input type="file" class="attachment-input" id="attachmentInput" name="attachments[]" multiple accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.csv,.json,.xml,.md,.html,.css,.js,.py,.php,.rb,.java,.c,.cpp,.h">
                            <textarea 
                                class="chat-input" 
                                id="chatInput" 
                                name="message" 
                                placeholder="Type your message here..." 
                                rows="1"
                                onkeydown="handleKeyDown(event)"
                                oninput="autoResize()"
                                required
                            ></textarea>
                            <button type="submit" class="send-btn" id="sendBtn">➤</button>
                        @endif
                    </div>
                    <div class="attachment-preview" id="attachmentPreview" style="display: none;"></div>
                    @if($aiAgents->count() > 0)
                        <input type="hidden" id="agentIdField" name="agent_id" value="{{ $aiAgents->where('is_default', true)->first()?->id ?? $aiAgents->first()->id }}">
                    @endif
                </form>
            </div>
        </div>
    </div>

    <script>
        // Theme Management
        const THEME_KEY = 'app_theme';
        
        function getStoredTheme() {
            return localStorage.getItem(THEME_KEY);
        }
        
        function setStoredTheme(theme) {
            localStorage.setItem(THEME_KEY, theme);
        }
        
        function getSystemTheme() {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        function getEffectiveTheme() {
            const stored = getStoredTheme();
            return stored || getSystemTheme();
        }
        
        function applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            updateThemeIcon(theme);
            setStoredTheme(theme);
        }
        
        function updateThemeIcon(theme) {
            const lightIcon = document.getElementById('themeIconLight');
            const darkIcon = document.getElementById('themeIconDark');
            if (lightIcon && darkIcon) {
                if (theme === 'dark') {
                    lightIcon.style.display = 'block';
                    darkIcon.style.display = 'none';
                } else {
                    lightIcon.style.display = 'none';
                    darkIcon.style.display = 'block';
                }
            }
        }
        
        function toggleTheme() {
            const current = getEffectiveTheme();
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
        }
        
        function initTheme() {
            const theme = getEffectiveTheme();
            applyTheme(theme);
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!getStoredTheme()) {
                    applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
        
        let isSubmitting = false;
        
        // Configure marked for safe rendering (if marked is loaded)
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: false,
                gfm: true,
                headerIds: false,
                mangle: false
            });
        }
        
        // Clean footnote references like [1][7] or [text][1] BEFORE markdown parsing
        function cleanFootnotes(text) {
            // Remove footnote patterns
            text = text.replace(/\[\d+\]+/g, '');
            text = text.replace(/\[([^\]]+)\]\[\d+\]/g, '$1');
            // Replace 3+ newlines with just 2 (prevents excessive spacing, keeps paragraph breaks)
            text = text.replace(/\n{3,}/g, '\n\n');
            // Trim each line
            text = text.replace(/^[ \t]+|[ \t]+$/gm, '');
            return text.trim();
        }
        
        // Render markdown in message bubbles
        function renderMessages() {
            try {
                document.querySelectorAll('.message.assistant .message-bubble').forEach(function(bubble) {
                    // Get raw text content
                    let text = bubble.textContent || bubble.innerText;
                    if (!text || !text.trim()) return;
                    
                    // Skip if already rendered
                    if (bubble.querySelector('p, ul, ol, h1, h2, h3, strong, em')) return;
                    
                    // Clean footnote references first (before markdown parsing)
                    text = cleanFootnotes(text);
                    
                    // Parse markdown to HTML
                    if (typeof marked !== 'undefined' && marked.parse) {
                        bubble.innerHTML = marked.parse(text);
                    } else if (window.markedFallback) {
                        // Use fallback parser
                        bubble.innerHTML = window.markedFallback(text);
                    }
                });
            } catch (e) {
                console.error('Error rendering messages:', e);
            }
        }
        
        // Clear textbox and render messages on page load
        function initPage() {
            document.getElementById('chatInput').value = '';
            renderMessages();
            updateChatTitle();
            autoResize();
            
            // Scroll to bottom on load
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
        
        // Try on DOMContentLoaded first, then on load as backup
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { initTheme(); initPage(); });
        } else {
            initTheme();
            initPage();
        }
        window.addEventListener('load', function() { initTheme(); initPage(); });
        
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }
        
        function toggleSidebarMinimize() {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('sidebarToggle');
            const header = document.querySelector('.header');
            sidebar.classList.toggle('minimized');
            toggle.classList.toggle('visible', sidebar.classList.contains('minimized'));
            header.classList.toggle('sidebar-minimized', sidebar.classList.contains('minimized'));
        }
        
        function filterChats() {
            const searchInput = document.getElementById('chatSearch');
            const filter = searchInput.value.toLowerCase();
            const chatItems = document.querySelectorAll('.chat-item');
            const noChatsMessage = document.getElementById('noChatsMessage');
            const noResultsMessage = document.getElementById('noResultsMessage');
            let visibleCount = 0;
            
            chatItems.forEach(item => {
                const title = item.dataset.title || '';
                if (title.includes(filter)) {
                    item.classList.remove('hidden');
                    visibleCount++;
                } else {
                    item.classList.add('hidden');
                }
            });
            
            if (noChatsMessage) {
                noChatsMessage.classList.toggle('hidden', visibleCount > 0 || filter.length > 0);
            }
            if (noResultsMessage) {
                noResultsMessage.classList.toggle('hidden', visibleCount > 0 || filter.length === 0);
            }
        }
        
        function updateChatTitle() {
            const chatTitleHeader = document.getElementById('chatTitleHeader');
            const headerTitle = document.getElementById('headerTitle');
            @if(isset($chat) && $chat)
                const chatTitle = {{ json_encode($chat->title) }};
                if (chatTitle) {
                    chatTitleHeader.textContent = chatTitle;
                    chatTitleHeader.style.display = 'inline';
                    headerTitle.style.display = 'none';
                }
            @endif
        }
        
        function toggleAgentDropdown() {
            const dropdown = document.getElementById('agentDropdown');
            const trigger = document.querySelector('.agent-selector-trigger');
            dropdown.classList.toggle('open');
            trigger.classList.toggle('open');
        }
        
        function selectAgent(agentId, provider, iconHtml, name) {
            const dropdown = document.getElementById('agentDropdown');
            const trigger = document.querySelector('.agent-selector-trigger');
            const selectedIcon = document.getElementById('selectedAgentIcon');
            const selectedName = document.getElementById('selectedAgentName');
            const hiddenField = document.getElementById('agentIdField');
            
            // Update hidden field
            if (hiddenField) hiddenField.value = agentId;
            
            // Update trigger display
            selectedIcon.innerHTML = iconHtml;
            selectedName.textContent = name;
            selectedName.title = name; // Set tooltip for full name
            
            // Update selected state in dropdown
            document.querySelectorAll('.agent-option').forEach(opt => {
                opt.classList.remove('selected');
                const check = opt.querySelector('.agent-option-check');
                if (check) check.remove();
            });
            
            const selectedOpt = document.querySelector(`.agent-option[data-agent-id="${agentId}"]`);
            if (selectedOpt) {
                selectedOpt.classList.add('selected');
                const check = document.createElement('span');
                check.className = 'agent-option-check';
                check.textContent = '✓';
                selectedOpt.appendChild(check);
            }
            
            // Close dropdown
            dropdown.classList.remove('open');
            trigger.classList.remove('open');
        }
        
        function selectAgentFromElement(el) {
            const agentId = el.dataset.agentId;
            const provider = el.dataset.provider;
            const iconHtml = el.dataset.icon.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
            const name = el.dataset.name.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
            selectAgent(agentId, provider, unescapeHtml(iconHtml), unescapeHtml(name));
        }
        
        function unescapeHtml(str) {
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent || div.innerText || '';
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const selector = document.getElementById('agentSelector');
            const dropdown = document.getElementById('agentDropdown');
            const trigger = document.querySelector('.agent-selector-trigger');
            if (selector && !selector.contains(e.target)) {
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            }
        });
        
        function updateAgentDisplay() {
            // Legacy function for compatibility
            const hiddenField = document.getElementById('agentIdField');
            const trigger = document.querySelector('.agent-selector-trigger');
            if (trigger && hiddenField) {
                const selectedOpt = document.querySelector('.agent-option.selected');
                if (selectedOpt) {
                    hiddenField.value = selectedOpt.dataset.agentId;
                }
            }
        }
        
        // Attachment handling
        const attachmentBtn = document.getElementById('attachmentBtn');
        const attachmentInput = document.getElementById('attachmentInput');
        const attachmentPreview = document.getElementById('attachmentPreview');
        let selectedFiles = [];
        
        if (attachmentBtn && attachmentInput) {
            attachmentBtn.addEventListener('click', function() {
                attachmentInput.click();
            });
            
            attachmentInput.addEventListener('change', function() {
                handleFileSelect(this.files);
            });
        }
        
        function handleFileSelect(files) {
            selectedFiles = Array.from(files);
            renderAttachmentPreview();
            updateAttachmentBtn();
        }

        // Handle paste events (clipboard images)
        document.addEventListener('paste', function(e) {
            const chatInput = document.getElementById('chatInput');
            // Only handle paste if focused on the chat input area
            if (!chatInput || !chatInput.contains(document.activeElement)) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type && item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        selectedFiles.push(file);
                        renderAttachmentPreview();
                        updateAttachmentBtn();
                    }
                    return;
                }
            }
        });
        
        function renderAttachmentPreview() {
            if (!attachmentPreview) return;

            if (selectedFiles.length === 0) {
                attachmentPreview.style.display = 'none';
                attachmentPreview.innerHTML = '';
                return;
            }

            attachmentPreview.style.display = 'flex';
            attachmentPreview.innerHTML = selectedFiles.map((file, index) => {
                const isImage = file.type && file.type.startsWith('image/');
                if (isImage) {
                    const url = URL.createObjectURL(file);
                    const name = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
                    return `<div class="attachment-preview-item attachment-preview-image">
                        <img src="${url}" alt="${file.name}" title="${file.name}" />
                        <span class="remove-btn" onclick="removeAttachment(${index})">✕</span>
                        <span class="attachment-name">${name}</span>
                    </div>`;
                } else {
                    const icon = getFileIcon(file.name);
                    const name = file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name;
                    return `<div class="attachment-preview-item">
                        <span>${icon}</span>
                        <span title="${file.name}">${name}</span>
                        <span class="remove-btn" onclick="removeAttachment(${index})">✕</span>
                    </div>`;
                }
            }).join('');
        }
        
        function getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const icons = {
                'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📃',
                'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'webp': '🖼️',
                'csv': '📊', 'json': '📋', 'xml': '📋',
                'md': '📝', 'html': '🌐', 'css': '🎨', 'js': '📜',
                'py': '🐍', 'php': '🐘', 'rb': '💎', 'java': '☕', 'c': '⚙️', 'cpp': '⚙️'
            };
            return icons[ext] || '📎';
        }
        
        function removeAttachment(index) {
            selectedFiles.splice(index, 1);
            renderAttachmentPreview();
            updateAttachmentBtn();
            // Clear the input so the same file can be selected again if needed
            if (attachmentInput) attachmentInput.value = '';
        }
        
        function updateAttachmentBtn() {
            if (attachmentBtn) {
                if (selectedFiles.length > 0) {
                    attachmentBtn.classList.add('has-files');
                } else {
                    attachmentBtn.classList.remove('has-files');
                }
            }
        }
        
        function autoResize() {
            const input = document.getElementById('chatInput');
            if (input) {
                input.style.height = 'auto';
                const newHeight = Math.min(input.scrollHeight, 150);
                input.style.height = Math.max(newHeight, 46) + 'px';
            }
        }
        
        function handleKeyDown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!isSubmitting) {
                    submitForm();
                }
            }
        }
        
        function submitForm() {
            const form = document.getElementById('chatForm');
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            const formAction = form.action;
            const isNewChat = !formAction.includes('/chat/');
            
            if (!message && selectedFiles.length === 0) return;
            
            isSubmitting = true;
            document.getElementById('sendBtn').disabled = true;
            
            // If there are attachments or it's a new chat, submit form normally (browser follows redirect)
            if (selectedFiles.length > 0 || isNewChat) {
                form.submit();
                return;
            }
            
            // For existing chats, use AJAX
            input.value = '';
            input.style.height = 'auto';
            
            // Add user message to chat immediately
            const messagesContainer = document.getElementById('chatMessages');
            const welcome = document.querySelector('.welcome');
            if (welcome) welcome.style.display = 'none';
            if (messagesContainer) {
                messagesContainer.style.display = 'flex';
                
                // Add user message
                const userMsg = document.createElement('div');
                userMsg.className = 'message user';
                userMsg.innerHTML = '<div class="message-bubble">' + escapeHtml(message) + '</div><div class="message-time">' + new Date().toLocaleTimeString() + '</div>';
                messagesContainer.appendChild(userMsg);
                
                // Show typing indicator
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'message assistant';
                typingIndicator.id = 'typing-indicator';
                typingIndicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div><div class="message-time">thinking...</div>';
                messagesContainer.appendChild(typingIndicator);
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Send via AJAX
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || 
                             document.querySelector('input[name="_token"]')?.value;
            
            fetch(formAction, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    '_token': csrfToken,
                    'message': message,
                    'agent_id': document.getElementById('agentIdField')?.value || ''
                })
            })
            .then(response => {
                if (response.ok) {
                    window.location.reload();
                } else {
                    throw new Error('Failed to send message');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                const typingIndicator = document.getElementById('typing-indicator');
                if (typingIndicator) typingIndicator.remove();
                alert('Failed to send message. Please try again.');
                isSubmitting = false;
                document.getElementById('sendBtn').disabled = false;
            });
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function handleSubmit() {
            if (isSubmitting) return false;
            
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return false;
            
            submitForm();
            return true;
        }
        
        // Auto-resize on load
        autoResize();
        
        // Show sidebar toggle on desktop
        if (window.innerWidth > 768) {
            document.getElementById('sidebarToggle').classList.add('visible');
        }
        
        window.addEventListener('resize', function() {
            const toggle = document.getElementById('sidebarToggle');
            if (window.innerWidth <= 768) {
                toggle.classList.remove('visible');
            }
        });
        
        // Scroll to bottom on load
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    </script>
</body>
</html>