# Truck Driver & Owner-Operator Job Platform Research Report

**Date:** 2026-04-12  
**Prepared for:** Truck Driver Job Aggregation Service

---

## Objective

Identify the top USA job platforms where truck drivers and owner-operators post their availability and contact information. Analyze data availability, scraping feasibility, and create a data collection strategy.

---

## Executive Summary

- Researched **9 major platforms** across general job boards and trucking-specific networks
- **No platform legally permits scraping** — all prohibit automated access in their ToS
- **4 platforms offer official APIs** (DAT, Truckstop, LinkedIn partners, Convoy/DAT)
- **2 platforms expose contact data** at scale: DAT (644K+ daily listings) and Truckstop (350K+)
- Recommended path: **official API partnership with DAT or Truckstop** for compliant, scalable data access
- For small-scale research: **TruckersReport** and **CDLjobs.com** are most accessible

---

## Key Findings

### Platforms with Contact Data Accessible
- **DAT.com** — Carrier directory exposes name, phone, DOT number, MC number, address
- **Truckstop.com** — Carrier profiles show phone and contact info (to authenticated users)

### Platforms with Limited Contact Data
- **TruckersReport.com** — Member-controlled; forum posts may contain contact info
- **CDLjobs.com** — Employer contact varies per job posting; no driver direct contact
- **Indeed** — Company name and location only; direct driver contact not exposed

### Platforms with No Usable Contact Data
- **LinkedIn** — Personal info not exposed publicly; legal risk to scrape
- **DriveMyWay** — Explicitly prohibits all data access; privacy-first design
- **FreightWaves** — News/data company, not a job board
- **Convoy** — Now part of DAT network; requires API partnership

---

## Analysis

### Volume of Listings
| Platform | Daily Listings | Type |
|----------|---------------|------|
| DAT Load Board | 644,500+ | Load board (carrier posts truck) |
| Truckstop.com | 350,000+ | Load board (carrier posts truck) |
| Indeed | 204,257+ | Job board (employer posts job) |
| LinkedIn | 1,000+ | Professional network |
| CDLjobs.com | Hundreds | Specialized CDL job board |
| TruckersReport | Not disclosed | Community + job board |

### API Availability
| Platform | API | Cost | Contact |
|----------|-----|------|---------|
| DAT | YES — REST/SOAP | Paid SIA | developersupport@dat.com |
| Truckstop | YES — REST OAuth2 | Paid SIA | developer.truckstop.com |
| Convoy | YES (DAT network) | Paid | partnerships@convoy.com |
| LinkedIn | YES (partners only) | Partnership | whitelist-crawl@linkedin.com |

### Scraping Difficulty
- **EXTREME:** LinkedIn, DriveMyWay — legal action precedent, explicit bans
- **VERY HIGH:** DAT, Truckstop, Indeed, Convoy — anti-bot, Cloudflare, auth required
- **MEDIUM:** TruckersReport, CDLjobs.com — dynamic JS, rate limiting but no heavy protection

---

## Risks and Limitations

- **Legal Risk:** Scraping without permission violates ToS and potentially the Computer Fraud and Abuse Act (CFAA). LinkedIn has won lawsuits against scrapers.
- **Data Quality:** Most platforms do not expose personal driver contact info publicly — only carrier company-level data
- **API Costs:** DAT and Truckstop API access typically costs $500–$2,000/month at commercial tiers
- **Platform Changes:** Anti-bot measures evolve rapidly (Cloudflare, TLS fingerprinting, browser challenges)
- **Owner-Operators vs. Drivers:** Load boards (DAT, Truckstop) surface owner-operators better than employee drivers

---

## Key Takeaways

- Owner-operator contact data is most accessible via **DAT and Truckstop** through official API partnerships
- Employee truck driver contact data is largely **not publicly exposed** on any platform
- The only scalable, legally compliant path is **paid API integration** with load boards
- For MVP/research phase: **TruckersReport job board** and **CDLjobs.com** offer accessible listings without API keys
- **FreightWaves** is not useful for this purpose (news company, not job board)

---

## Recommended Next Steps

1. **Apply for DAT Systems Integration Agreement**
   - URL: dat.com/resources/api-integration
   - Contact: developersupport@dat.com
   - Expected cost: $500–$2,000/month

2. **Register at Truckstop Developer Portal**
   - URL: developer.truckstop.com
   - Contact: 1-800-203-2540, Support@truckstop.com

3. **Build MVP scraper for TruckersReport + CDLjobs.com**
   - Tools: Python + BeautifulSoup + httpx
   - Rate limit: 1 request/5 seconds
   - Target: Job board sections only

4. **Set up deduplication pipeline**
   - Composite key: platform + job_id
   - Database: PostgreSQL with upsert logic
   - Daily delta pulls using date filters

5. **Monitor FMCSA public carrier database**
   - Free government data: fmcsa.dot.gov/safety/carrier-search
   - Contains: company name, phone, address, DOT number for all licensed carriers

---

## Sources

- DAT Load Board: https://www.dat.com
- DAT API Docs: https://www.dat.com/resources/api-integration
- Truckstop Developer Portal: https://developer.truckstop.com
- TruckersReport: https://www.thetruckersreport.com
- CDLjobs.com: https://www.cdljobs.com
- Indeed Legal/ToS: https://www.indeed.com/legal
- LinkedIn User Agreement: https://www.linkedin.com/legal/user-agreement
- DriveMyWay ToS: https://www.drivemyway.com/terms/
- FMCSA Carrier Search: https://www.fmcsa.dot.gov/safety/carrier-search
- FreightWaves: https://www.freightwaves.com
