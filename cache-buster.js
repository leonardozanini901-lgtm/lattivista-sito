(function() {
    const getTimestamp = () => Date.now();

    // 1. Intercetta AUTOMATICAMENTE ogni fetch() JSON/dati del sito
    const originalFetch = window.fetch;
    window.fetch = function(resource, init = {}) {
        let url = typeof resource === 'string' ? resource : resource.url;
        
        // Applica il cache-busting solo ai file locali o JSON/content
        if (typeof url === 'string' && !url.startsWith('data:')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}_t=${getTimestamp()}`;
        }

        const newResource = typeof resource === 'string' ? url : new Request(url, resource);
        return originalFetch.call(this, newResource, {
            ...init,
            cache: 'no-store'
        });
    };

    // 2. Intercetta AUTOMATICAMENTE qualsiasi immagine creata o modificata via JS
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        set: function(val) {
            if (val && typeof val === 'string' && !val.startsWith('data:') && !val.includes('_t=')) {
                const separator = val.includes('?') ? '&' : '?';
                val = `${val}${separator}_t=${getTimestamp()}`;
            }
            originalSrcDescriptor.set.call(this, val);
        },
        get: function() {
            return originalSrcDescriptor.get.call(this);
        }
    });

    // 3. Forzatura dei Meta Tag No-Cache nell'head
    const metaTags = [
        { 'http-equiv': 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
        { 'http-equiv': 'Pragma', content: 'no-cache' },
        { 'http-equiv': 'Expires', content: '0' }
    ];
    metaTags.forEach(attr => {
        const meta = document.createElement('meta');
        Object.keys(attr).forEach(key => meta.setAttribute(key, attr[key]));
        document.head.appendChild(meta);
    });
})();