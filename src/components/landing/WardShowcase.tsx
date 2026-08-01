"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, CloudRain, Droplets, ExternalLink, AlertTriangle } from "lucide-react";

const WardShowcase = () => {
  const wards = [
    {
      id: "L-Ward",
      title: "Kurla (L Ward)",
      category: "CRITICAL SEVERITY",
      description: "High vulnerability zone. Mithi river overflow expected within 4 hours based on current rainfall trajectory.",
      rainfall: "145mm",
      capacity: "200mm",
      saturation: 85,
      activePumps: 12,
      trend: "up"
    },
    {
      id: "G-North",
      title: "Dadar (G North)",
      category: "MODERATE SEVERITY",
      description: "Hindmata junction showing initial signs of waterlogging. Traffic diversions recommended.",
      rainfall: "90mm",
      capacity: "150mm",
      saturation: 60,
      activePumps: 8,
      trend: "flat"
    },
    {
      id: "K-East",
      title: "Andheri East (K East)",
      category: "HIGH SEVERITY",
      description: "Subway clearance operations ongoing. Soil saturation at critical levels near Milan Subway.",
      rainfall: "120mm",
      capacity: "160mm",
      saturation: 75,
      activePumps: 15,
      trend: "up"
    }
  ];

  return (
    <section className="bg-black/30 py-32 px-6 lg:px-16 border-t border-white/5 relative">
      <div className="max-w-[1200px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6"
        >
          <div>
            <h2 className="text-white mb-4 font-clash font-medium text-[clamp(2rem,5vw,3rem)] tracking-tight uppercase leading-[1.1]">
              Live Ward Status
            </h2>
            <p className="text-gray-400 font-satoshi text-[1.1rem] tracking-wide font-light max-w-xl">
              Real-time vulnerability metrics for Mumbai's most critical zones
            </p>
          </div>

          <Link href="/map" className="hidden md:block">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 border border-white/15 px-6 py-2.5 rounded-full text-white/80 font-medium hover:border-white/30 transition-all font-satoshi text-sm"
            >
              <span>View 3D Map</span>
              <ExternalLink className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wards.map((ward, index) => (
            <motion.div
              key={ward.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link href={`/dashboard`}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="bg-black border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-300 h-full flex flex-col group shadow-sm"
                >
                  {/* Status Badge */}
                  <div className="mb-6 flex justify-between items-start">
                    <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${ward.category.includes('CRITICAL') ? 'text-[#D94444]' : ward.category.includes('HIGH') ? 'text-orange-400' : 'text-[#5EA977]'}`}>
                      {ward.category}
                    </span>
                    {ward.trend === 'up' && (
                      <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-full text-gray-300">
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        Rising
                      </span>
                    )}
                  </div>

                  <h3 className="text-white mb-3 text-[1.5rem] font-clash font-medium tracking-tight group-hover:text-gray-300 transition-colors">
                    {ward.title}
                  </h3>

                  <p className="text-gray-500 mb-8 font-satoshi font-light leading-[1.6] text-[0.95rem] flex-1">
                    {ward.description}
                  </p>

                  {/* Progress Bar for Rain vs Capacity */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-500 text-[10px] font-bold tracking-[0.1em] uppercase">
                        Rainfall / Capacity
                      </span>
                      <span className="text-white text-[12px] font-medium font-satoshi">
                        {ward.rainfall} / {ward.capacity}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(parseInt(ward.rainfall) / parseInt(ward.capacity)) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className={`h-full ${ward.category.includes('CRITICAL') ? 'bg-[#D94444]' : 'bg-[#5EA977]'}`}
                      />
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between pt-5 border-t border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1.5 text-gray-400">
                        <Droplets className="w-4 h-4 text-[#5B8DEF]" strokeWidth={1.5} />
                        <span className="text-[12px] font-satoshi font-medium">{ward.saturation}% Soil</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-gray-400">
                        <Activity className="w-4 h-4 text-[#5EA977]" strokeWidth={1.5} />
                        <span className="text-[12px] font-satoshi font-medium">{ward.activePumps} Pumps</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center md:hidden"
        >
          <Link href="/map">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 border border-white/15 px-6 py-3 rounded-full text-white font-medium mx-auto text-sm"
            >
              <span>View 3D Map</span>
              <ExternalLink className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default WardShowcase;
