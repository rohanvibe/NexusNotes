import { db } from '../db/indexeddb.js';

export const GraphComponent = {
    async render() {
        return `
        <div class="flex-1 w-full flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative fade-in" id="graph-container">
            
            <!-- Graph overlay UI -->
            <div class="absolute top-6 left-6 z-10 w-72 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl text-slate-900 dark:text-slate-200">
                <div class="flex items-center gap-2 mb-1">
                    <span class="material-symbols-outlined text-primary">hub</span>
                    <h3 class="font-bold text-lg">Knowledge Graph</h3>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-4" id="graph-stats" title="The current quantitative assessment of your interconnected mnemomic entities.">Loading notes...</p>
                
                <div class="space-y-3">
                    <button class="w-full py-2.5 bg-primary hover:bg-primary/90 rounded-xl text-xs font-black text-white transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2" 
                            id="btn-recenter" 
                            title="Execute a spatial recalibration of the viewport to achieve optimal orthographic equilibrium.">
                        <span class="material-symbols-outlined text-sm">center_focus_strong</span>
                        RECENTER PERSPECTIVE
                    </button>
                    
                    <div class="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-border-custom">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Heuristic Logic</p>
                        <p class="text-[10px] leading-relaxed text-slate-500">Autonomous syntactical associations are established via identical tag descriptors to facilitate cognitive clustering.</p>
                    </div>
                </div>
            </div>

            <!-- Floating Legend -->
            <div class="absolute bottom-6 right-6 z-10 hidden md:block">
                <div class="flex flex-col gap-2 p-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/20">
                     <div class="flex items-center gap-2">
                        <div class="size-2 rounded-full bg-primary animate-pulse"></div>
                        <span class="text-[10px] font-bold uppercase tracking-tighter">Active Synapse</span>
                     </div>
                </div>
            </div>

            <!-- Graph Canvas -->
            <div class="absolute inset-0 z-0 bg-transparent cursor-grab active:cursor-grabbing" id="graph-canvas"></div>

        </div>
        `;
    },

    async onRender(container) {
        const graphContainer = container.querySelector('#graph-canvas');
        const statsEl = container.querySelector('#graph-stats');

        // Fetch data
        const notes = await db.getAllNotes();
        const edges = await db.getAll('edges');

        // Dynamically create links based on tags
        let graphLinks = [...edges];
        // Ensure we handle the source/target being objects or IDs if they come from DB
        graphLinks = graphLinks.map(l => ({
            source: typeof l.source === 'object' ? l.source.id : l.source,
            target: typeof l.target === 'object' ? l.target.id : l.target,
            value: l.value || 1
        }));

        if (notes.length > 1) {
            // Create implicit links if they share a tag
            for (let i = 0; i < notes.length; i++) {
                for (let j = i + 1; j < notes.length; j++) {
                    if (!notes[i].tags || !notes[j].tags || !notes[i].id || !notes[j].id) continue;
                    const sharedTags = notes[i].tags.filter(t => notes[j].tags.includes(t));
                    if (sharedTags.length > 0) {
                        // Check if link already exists to avoid duplicates
                        const exists = graphLinks.some(l =>
                            (l.source === notes[i].id && l.target === notes[j].id) ||
                            (l.source === notes[j].id && l.target === notes[i].id)
                        );
                        if (!exists) {
                            graphLinks.push({ source: notes[i].id, target: notes[j].id, value: sharedTags.length });
                        }
                    }
                }
            }
        }

        const graphData = {
            nodes: notes.map(n => ({
                id: n.id,
                name: n.title || 'Untitled',
                group: (n.tags && n.tags[0]) ? n.tags[0] : 'general',
                val: (n.content?.length / 500) + 2
            })),
            links: graphLinks
        };

        statsEl.textContent = `${graphData.nodes.length} nodes, ${graphData.links.length} connections`;

        if (window.ForceGraph) {
            const isDark = document.documentElement.classList.contains('dark');

            let primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
            if (!primaryColor) primaryColor = '#7c3bed';

            const Graph = window.ForceGraph()(graphContainer)
                .graphData(graphData)
                .nodeLabel('name')
                .nodeAutoColorBy('group')
                .linkColor(() => isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                .linkDirectionalParticles(2)
                .linkDirectionalParticleSpeed(d => d.value * 0.005)
                .linkDirectionalParticleWidth(2)
                .onNodeClick(node => {
                    window.AppRouter.navigate(`#/editor?id=${node.id}`);
                })
                .nodeCanvasObject((node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px 'Inter', sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.6);

                    // Draw Node Circle
                    ctx.fillStyle = node.color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                    ctx.fill();

                    // Draw Text Background
                    ctx.fillStyle = isDark ? 'rgba(15, 10, 25, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                    ctx.beginPath();
                    ctx.roundRect(node.x - bckgDimensions[0] / 2, node.y + 6, bckgDimensions[0], bckgDimensions[1], 4);
                    ctx.fill();

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
                    ctx.fillText(label, node.x, node.y + 8);
                });

            // Handle Resize
            const resize = () => Graph.width(graphContainer.clientWidth).height(graphContainer.clientHeight);
            window.addEventListener('resize', resize);
            resize();

            // Store graph on window for debugging if needed
            window._CurrentGraph = Graph;

            // Handle Recenter
            container.querySelector('#btn-recenter').addEventListener('click', () => {
                Graph.zoomToFit(600, 50);
            });
        } else {
            console.error("ForceGraph library not found on window object.");
            graphContainer.innerHTML = `<div class="p-20 text-center text-red-500">Visualization Engine Failed to Initialize</div>`;
        }
    }
}
