"use client";
import Link from "next/link";
import { Github, Twitter, MessageCircle, FileText, Mail, Heart } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  const footerLinks = {
    Platform: [
      { name: "Live Map", path: "/map" },
      { name: "Ward Dashboard", path: "/dashboard" },
      { name: "Climate Models", path: "/dashboard" },
    ],
    Organization: [
      { name: "About the Project", path: "#" },
      { name: "BMC Integration", path: "#" },
      { name: "Data Sources", path: "#" },
    ],
    Resources: [
      { name: "API Documentation", path: "#" },
      { name: "SOP Guidelines", path: "#" },
      { name: "Support Center", path: "#" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Github, href: "#", label: "Github" },
    { icon: MessageCircle, href: "#", label: "Discord" },
    { icon: FileText, href: "#", label: "Blog" },
  ];

  return (
    <footer className="relative border-t border-white/10 bg-black">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:scale-105 transition-transform">
                <path d="M12 2v20"></path>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span className="font-bold text-xl tracking-tight font-clash text-white">MUMBAI FLOOD</span>
            </Link>

            <p className="text-gray-400 mb-6 max-w-md font-satoshi text-[0.95rem] font-light leading-[1.6]">
              An AI-powered digital twin for Mumbai. Real-time ward-level severity predictions, dynamic evacuation routing, and actionable emergency alerts.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" strokeWidth={1.5} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white mb-4 uppercase font-satoshi font-medium text-[1rem] tracking-[0.05em]">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.path}
                      className="text-gray-400 hover:text-white transition-colors duration-200 font-satoshi font-light text-[0.9rem]"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="py-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-white mb-2 font-satoshi font-medium text-[1.25rem] tracking-[0.02em]">
                System Updates
              </h3>
              <p className="text-gray-400 font-satoshi font-light text-[0.9rem]">
                Subscribe for major platform updates and seasonal climate reports.
              </p>
            </div>

            <div className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1 md:w-80">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-satoshi font-light text-[0.9rem]"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-white text-black rounded-lg uppercase transition-all hover:bg-gray-200 whitespace-nowrap font-satoshi font-medium text-[0.875rem] tracking-[0.05em]"
              >
                Subscribe
              </motion.button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 font-satoshi font-light text-[0.875rem]">
            © 2026 Mumbai Flood Command Center. All rights reserved.
          </p>

          <div className="flex items-center space-x-6">
            <Link href="#" className="text-gray-400 hover:text-white transition-colors font-satoshi font-light text-[0.875rem]">
              Privacy Policy
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white transition-colors font-satoshi font-light text-[0.875rem]">
              Terms of Service
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white transition-colors font-satoshi font-light text-[0.875rem]">
              Data Policy
            </Link>
          </div>

          <div className="flex items-center space-x-2 text-gray-400 font-satoshi font-light text-[0.875rem]">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>for Mumbai</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
