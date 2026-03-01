import { db } from '../db/indexeddb.js';

export const GraphComponent = {
    async render() {
        return `
        <div class="flex-1 w-full flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative fade-in" id="graph-container">
            
            <!-- Strategic Overlay -->
            <div class="absolute top-6 left-6 z-10 w-80 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 rounded-[2rem] p-6 shadow-2xl text-slate-900 dark:text-slate-200">
                <div class="flex items-center gap-3 mb-6">
                    <div class="size-10 bg-primary/20 rounded-2xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">hub</span>
                    </div>
                    <div>
                        <h3 class="font-black text-lg uppercase tracking-tighter">Knowledge Web</h3>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest" id="graph-stats">Analyzing Synapses...</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-2">
                         <button class="py-3 bg-primary hover:bg-primary/90 rounded-2xl text-[9px] font-black text-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2" id="btn-recenter">
                            <span class="material-symbols-outlined text-xs">center_focus_strong</span>
                            RECENTER
                        </button>
                         <button class="py-3 bg-slate-100 dark:bg-slate-700/50 rounded-2xl text-[9px] font-black text-slate-500 transition-all flex items-center justify-center gap-2" id="btn-3d-toggle">
                            <span class="material-symbols-outlined text-xs">3d_rotation</span>
                            3D VIEW
                        </button>
                    </div>

                    <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-border-custom space-y-3">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Global Heuristics</p>
                        <div class="space-y-2">
                             <div class="flex items-center justify-between">
                                <span class="text-[9px] text-slate-500 font-bold uppercase">Clustering Index</span>
                                <span class="text-[9px] text-primary font-black">94.2%</span>
                             </div>
                             <div class="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div class="h-full bg-primary" id="sim-progress" style="width: 100%"></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Graph Canvas -->
            <div class="absolute inset-0 z-0 bg-transparent" id="graph-canvas"></div>

        </div>
        `;
    },

    async onRender(container) {
        const graphContainer = container.querySelector('#graph-canvas');
        const statsEl = container.querySelector('#graph-stats');

        // Fetch local data
        const notes = await db.getAllNotes();
        const edges = await db.getAll('edges');

        // Prepare Graph Data
        const graphData = {
            nodes: notes.map(n => ({
                id: n.id,
                name: n.title || 'Untitled',
                group: (n.tags && n.tags[0]) ? n.tags[0] : 'general',
                val: (n.content?.length / 500) + 2
            })),
            links: edges.map(l => ({
                source: l.source,
                target: l.target,
                value: 2
            }))
        };

        // Add implicit links from Knowledge Engine (Wiki links)
        for (let i = 0; i < notes.length; i++) {
            for (let j = i + 1; j < notes.length; j++) {
                if (!notes[i].tags || !notes[j].tags) continue;
                const sharedTags = notes[i].tags.filter(t => notes[j].tags.includes(t));
                if (sharedTags.length > 0) {
                    graphData.links.push({ source: notes[i].id, target: notes[j].id, value: 1 });
                }
            }
        }

        statsEl.textContent = `${graphData.nodes.length} SYNAPSES, ${graphData.links.length} TIES`;

        if (window.ForceGraph) {
            const isDark = document.documentElement.classList.contains('dark');

            const Graph = window.ForceGraph()(graphContainer)
                .graphData(graphData)
                .nodeLabel('name')
                .nodeAutoColorBy('group')
                .linkColor(() => isDark ? 'rgba(124, 60, 237, 0.15)' : 'rgba(124, 60, 237, 0.1)')
                .linkWidth(1)
                .linkDirectionalParticles(2)
                .linkDirectionalParticleSpeed(0.004)
                .linkDirectionalParticleWidth(1.5)
                .onNodeClick(node => window.AppRouter.navigate(`#/editor?id=${node.id}`))
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px 'Inter', sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.8);

                    // Central Circle
                    ctx.fillStyle = node.color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                    ctx.fill();

                    // Label Background
                    ctx.fillStyle = isDark ? 'rgba(15, 10, 25, 0.9)' : 'rgba(255, 255, 255, 0.9)';
                    ctx.beginPath();
                    ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y + 8, bckgDimensions[0], bckgDimensions[1], 6);
                    ctx.fill();

                    // Text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = isDark ? '#cbd5e1' : '#1e293b';
                    ctx.fillText(label, node.x, node.y + 10);
                });

            // Handle Interaction
            container.querySelector('#btn-recenter').onclick = () => Graph.zoomToFit(600, 80);

            window.addEventListener('resize', () => Graph.width(graphContainer.clientWidth).height(graphContainer.clientHeight));
        }
    }
}
