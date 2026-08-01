"use client";
import { motion } from "framer-motion";
import { Brain, Map, BellRing, Activity } from "lucide-react";

const features = [
    {
        icon: Brain,
        title: "AI Severity Engine",
        description: "Predictive models trained on 34 years of climate data to forecast waterlogging severity with high precision.",
    },
    {
        icon: Map,
        title: "3D Digital Twin",
        description: "Interactive, real-time geospatial visualization of Mumbai's 24 administrative wards and critical infrastructure.",
    },
    {
        icon: BellRing,
        title: "RAG Alert System",
        description: "Automated, context-aware emergency alerts and standard operating procedures generated using RAG technology.",
    },
    {
        icon: Activity,
        title: "Ward-Level Monitoring",
        description: "Live tracking of rainfall, soil saturation, and pump status across all municipal wards for rapid response.",
    },
];

const CoreFeatures = () => {
    return (
        <section className="bg-black py-32 px-6 lg:px-16 border-t border-white/5">
            <div className="max-w-[1200px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-20"
                >
                    <h2 className="text-white mb-6 font-clash font-medium text-[clamp(2.5rem,5vw,4rem)] tracking-tight leading-[1.1] uppercase">
                        PLATFORM <br />
                        <span className="text-gray-400">INFRASTRUCTURE</span>
                    </h2>
                    <p className="text-gray-500 max-w-xl font-satoshi text-[1.1rem] tracking-wide font-light">
                        The structural foundation for predictive modeling, real-time monitoring, and automated emergency response.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="group flex flex-col p-8 rounded-xl bg-[#050505] border border-white/[0.03] hover:border-white/10 transition-all duration-300 shadow-sm"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white/[0.02] flex items-center justify-center mb-8 border border-white/[0.05] group-hover:bg-white/5 transition-colors">
                                <feature.icon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-white font-medium text-base mb-4 tracking-tight font-satoshi">
                                {feature.title}
                            </h3>
                            <p className="text-gray-500 text-xs leading-relaxed font-light font-satoshi">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CoreFeatures;
