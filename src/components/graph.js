import { db } from '../db/indexeddb.js';

export const GraphComponent = {
    async render() {
        return `
        <div class="flex-1 w-full flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative fade-in" id="graph-container">
            
            <!-- Graph overlay UI -->
            <div class="absolute top-6 left-6 z-10 w-72 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl text-slate-900 dark:text-slate-200">
                <h3 class="font-bold text-lg mb-1">Knowledge Graph</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4" id="graph-stats">Loading notes...</p>
                
                <div class="mt-6">
                    <button class="w-full py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold text-white transition-colors" id="btn-recenter">
                        Recenter Graph
                    </button>
                     <div class="mt-2 text-xs text-center text-slate-400">Notes are automatically linked if they share identical tags.</div>
                </div>
            </div>

            <!-- Graph Canvas -->
            <div class="absolute inset-0 z-0" id="3d-graph"></div>

        </div>
        `;
    },

    async onRender(container) {
        const graphContainer = container.querySelector('#3d-graph');
        const statsEl = container.querySelector('#graph-stats');

        // Fetch data
        const notes = await db.getAllNotes();
        const edges = await db.getAll('edges');

        // Let's create mock edges dynamically based on tags if no actual edges exist!
        let graphLinks = [...edges];
        if (graphLinks.length === 0 && notes.length > 1) {
            // Create implicit links if they share a tag
            for (let i = 0; i < notes.length; i++) {
                for (let j = i + 1; j < notes.length; j++) {
                    if (!notes[i].tags || !notes[j].tags) continue;
                    const sharedTags = notes[i].tags.filter(t => notes[j].tags.includes(t));
                    if (sharedTags.length > 0) {
                        graphLinks.push({ source: notes[i].id, target: notes[j].id, value: sharedTags.length });
                    }
                }
            }
        }

        const graphData = {
            nodes: notes.map(n => ({ id: n.id, name: n.title || 'Untitled', group: (n.tags && n.tags[0]) ? n.tags[0] : 'general' })),
            links: graphLinks
        };

        statsEl.textContent = `${graphData.nodes.length} notes, ${graphData.links.length} connections`;

        if (window.ForceGraph) {

            // Primary color variable mapping
            let primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
            if (!primaryColor) primaryColor = '#7c3bed';

            const Graph = ForceGraph()(graphContainer)
                .graphData(graphData)
                .nodeLabel('name')
                .nodeAutoColorBy('group')
                .linkColor(() => document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                .linkWidth(2)
                .onNodeClick(node => {
                    // Navigate to node on click
                    window.AppRouter.navigate(`#/editor?id=${node.id}`);
                })
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 14 / globalScale;
                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

                    ctx.fillStyle = document.documentElement.classList.contains('dark') ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1], 6);
                    ctx.fill();

                    ctx.strokeStyle = node.color;
                    ctx.lineWidth = 2 / globalScale;
                    ctx.stroke();

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.color;
                    ctx.fillText(label, node.x, node.y);

                    node.__bckgDimensions = bckgDimensions;
                });

            // Handle Resize
            const resize = () => Graph.width(graphContainer.clientWidth).height(graphContainer.clientHeight);
            window.addEventListener('resize', resize);
            resize();

            // Handle Recenter
            container.querySelector('#btn-recenter').addEventListener('click', () => {
                Graph.zoomToFit(400);
            });
        }
    }
}
