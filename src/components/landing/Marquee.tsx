"use client";
import { motion } from "framer-motion";

const Marquee = () => {
  const testimonials = [
    {
      name: "Dr. Ananya Desai",
      username: "Climate Scientist",
      avatar: "AD",
      color: "from-blue-500 to-cyan-500",
      text: "The 3D Digital Twin provides unprecedented clarity. Predicting ward-level waterlogging before the monsoon hits changes everything for disaster prep.",
    },
    {
      name: "Rajiv Menon",
      username: "Urban Planner, BMC",
      avatar: "RM",
      color: "from-green-500 to-emerald-500",
      text: "Finally, a platform that aggregates 34 years of climate data into actionable insights. The automated pump deployment alerts are a lifesaver.",
    },
    {
      name: "Priya Sharma",
      username: "Emergency Response",
      avatar: "PS",
      color: "from-orange-500 to-red-500",
      text: "Real-time RAG alerts ensure our teams are exactly where they need to be. It takes the guesswork out of navigating flooded arterial roads.",
    },
    {
      name: "Vikram Joshi",
      username: "Meteorologist",
      avatar: "VJ",
      color: "from-purple-500 to-pink-500",
      text: "Integrating live weather triggers with predictive models allows us to forecast severity with near-pinpoint accuracy for all 24 wards.",
    },
    {
      name: "Sneha Patel",
      username: "Ward Coordinator",
      avatar: "SP",
      color: "from-indigo-500 to-purple-500",
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
              className="flex-shrink-0 w-[400px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm font-satoshi">
                    {testimonial.name}
                  </h4>
                  <p className="text-gray-400 text-xs font-satoshi">
                    {testimonial.username}
                  </p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed font-satoshi">
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
              className="flex-shrink-0 w-[400px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm font-satoshi">
                    {testimonial.name}
                  </h4>
                  <p className="text-gray-400 text-xs font-satoshi">
                    {testimonial.username}
                  </p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed font-satoshi">
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
