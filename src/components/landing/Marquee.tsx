"use client";
import { motion } from "framer-motion";

const Marquee = () => {
  const testimonials = [
    {
      name: "Dr. Ananya Desai",
      username: "Climate Scientist",
      avatar: "AD",
      role: "IMD Advisory",
      text: "The 3D Digital Twin provides unprecedented clarity. Predicting ward-level waterlogging before the monsoon hits changes everything for disaster prep.",
    },
    {
      name: "Rajiv Menon",
      username: "Urban Planner, BMC",
      avatar: "RM",
      role: "Disaster Cell",
      text: "Finally, a platform that aggregates 34 years of climate data into actionable insights. The automated pump deployment alerts are a lifesaver.",
    },
    {
      name: "Priya Sharma",
      username: "Emergency Response",
      avatar: "PS",
      role: "NDRF Ops",
      text: "Real-time RAG alerts ensure our teams are exactly where they need to be. It takes the guesswork out of navigating flooded arterial roads.",
    },
    {
      name: "Vikram Joshi",
      username: "Meteorologist",
      avatar: "VJ",
      role: "Regional Radar",
      text: "Integrating live weather triggers with predictive models allows us to forecast severity with near-pinpoint accuracy for all 24 wards.",
    },
    {
      name: "Sneha Patel",
      username: "Ward Coordinator",
      avatar: "SP",
      role: "Ward L Control",
      text: "The command center dashboard gives me a bird's eye view of my ward's vulnerability. We can now proactively clear choke points.",
    },
  ];

  return (
    <div className="bg-black py-16 overflow-hidden border-t border-white/5">
      <div className="relative flex">
        {/* First set */}
        <motion.div
          className="flex gap-6"
          animate={{
            x: ["-100%", "0%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 50,
              ease: "linear",
            },
          }}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={`first-${index}`}
              className="flex-shrink-0 w-[400px] bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/25 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/15 flex items-center justify-center text-white font-mono font-semibold text-xs tracking-wider shadow-inner">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm font-satoshi">
                    {testimonial.name}
                  </h4>
                  <p className="text-gray-400 text-xs font-satoshi flex items-center gap-1.5">
                    <span>{testimonial.username}</span>
                    <span className="text-[10px] text-gray-500 font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/5">
                      {testimonial.role}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed font-satoshi font-light">
                {testimonial.text}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Second set for seamless loop */}
        <motion.div
          className="flex gap-6 ml-6"
          animate={{
            x: ["-100%", "0%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 50,
              ease: "linear",
            },
          }}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={`second-${index}`}
              className="flex-shrink-0 w-[400px] bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/25 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/15 flex items-center justify-center text-white font-mono font-semibold text-xs tracking-wider shadow-inner">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm font-satoshi">
                    {testimonial.name}
                  </h4>
                  <p className="text-gray-400 text-xs font-satoshi flex items-center gap-1.5">
                    <span>{testimonial.username}</span>
                    <span className="text-[10px] text-gray-500 font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/5">
                      {testimonial.role}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed font-satoshi font-light">
                {testimonial.text}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Marquee;
