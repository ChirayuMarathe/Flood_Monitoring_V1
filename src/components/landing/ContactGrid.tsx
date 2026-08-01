"use client";
import { motion } from "framer-motion";
import { AlertTriangle, Terminal, MessageCircle, ArrowRight } from "lucide-react";

const ContactGrid = () => {
  const features = [
    {
      icon: AlertTriangle,
      title: "Emergency Support",
      description:
        "Direct line to BMC disaster management cell for immediate waterlogging or infrastructure failure reports.",
      label: "REPORT NOW",
      link: "#"
    },
    {
      icon: Terminal,
      title: "API & Data Access",
      description:
        "Technical support for integrating our predictive climate models and real-time ward data into your systems.",
      label: "VIEW DOCS",
      link: "#"
    },
    {
      icon: MessageCircle,
      title: "General Inquiries",
      description:
        "For general questions regarding the platform, data sources, and collaboration opportunities.",
      label: "CONTACT US",
      link: "#"
    },
  ];

  return (
    <section className="bg-black py-32 px-6 lg:px-16 border-t border-white/5">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <h2 className="text-white mb-6 font-clash font-medium text-[clamp(2.5rem,5vw,4rem)] tracking-tight leading-[1.1] uppercase">
            NEED ASSISTANCE?
            <br />
            <span className="text-gray-400">CONNECT WITH US</span>
          </h2>
          <p className="text-gray-500 max-w-md font-satoshi text-[0.95rem] tracking-wide uppercase font-light leading-relaxed">
            Reach out to the command center team for emergency reporting, API access, or general platform inquiries.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.a
              href={feature.link}
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-black border border-white/10 rounded-xl p-8 hover:border-white/30 transition-all duration-300 group shadow-sm flex flex-col"
            >
              <div className="mb-8 flex-1">
                <feature.icon
                  className="w-10 h-10 text-white/80 mb-6 group-hover:text-white transition-colors"
                  strokeWidth={1.5}
                />

                <h3 className="text-white mb-4 font-satoshi text-[1.5rem] tracking-tight font-medium">
                  {feature.title}
                </h3>

                <p className="text-gray-500 mb-8 font-satoshi font-light text-[0.95rem] leading-[1.6]">
                  {feature.description}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-white group-hover:text-gray-300 transition-colors uppercase font-satoshi font-medium text-[0.85rem] tracking-[0.1em]">
                <span>{feature.label}</span>
                <ArrowRight
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  strokeWidth={2}
                />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactGrid;
