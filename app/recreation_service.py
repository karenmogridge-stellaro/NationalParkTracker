"""Service for integrating with Recreation.gov API."""

import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class RecreationGovService:
    """Handle Recreation.gov API interactions."""
    
    BASE_URL = "https://www.recreation.gov/api/camps/availability/campgrounds"
    
    @staticmethod
    async def get_campground_by_name(campground_name: str) -> Optional[Dict]:
        """
        Search for a campground by name on Recreation.gov.
        Returns campground data including ID if found.
        """
        try:
            async with httpx.AsyncClient() as client:
                # Recreation.gov search endpoint
                response = await client.get(
                    "https://www.recreation.gov/api/camps/search",
                    params={"query": campground_name},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("data") and len(data["data"]) > 0:
                        return data["data"][0]
        except Exception as e:
            print(f"Error searching Recreation.gov: {e}")
        return None
    
    @staticmethod
    async def get_campground_availability(
        campground_id: int,
        month: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Get campground availability for a specific month.
        Month format: YYYY-MM-01 (e.g., 2024-02-01)
        If month not provided, uses current month.
        """
        if not month:
            today = datetime.now()
            month = today.strftime("%Y-%m-01")
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{RecreationGovService.BASE_URL}/{campground_id}/month/{month}"
                response = await client.get(url, timeout=10.0)
                
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"Error fetching Recreation.gov availability: {e}")
        
        return None
    
    @staticmethod
    async def parse_availability(
        availability_data: Dict,
        campground_id: int
    ) -> List[Dict]:
        """
        Parse campground availability data and return formatted campsite info.
        
        Returns list of campsites with availability status.
        """
        if not availability_data or "campsites" not in availability_data:
            return []
        
        campsites = []
        for site_id, site_data in availability_data.get("campsites", {}).items():
            site_info = {
                "site_id": site_id,
                "campground_id": campground_id,
                "name": site_data.get("site_name", f"Site {site_id}"),
                "loop": site_data.get("loop", "Unknown"),
                "type": site_data.get("site_type", "Unknown"),
                "availability": {}
            }
            
            # Parse availability for each date
            for date_str, status in site_data.get("availabilities", {}).items():
                if status == "Available":
                    site_info["availability"][date_str] = "available"
                elif status == "Reserved":
                    site_info["availability"][date_str] = "reserved"
                elif status == "Walk-up Available":
                    site_info["availability"][date_str] = "walkup"
                else:
                    site_info["availability"][date_str] = "unavailable"
            
            campsites.append(site_info)
        
        return campsites
    
    @staticmethod
    async def get_available_dates(
        campground_id: int,
        num_months: int = 3
    ) -> Dict[str, List[str]]:
        """
        Get available dates for a campground across multiple months.
        Returns dict mapping campsite names to lists of available dates.
        """
        available_dates = {}
        today = datetime.now()
        
        try:
            # Check multiple months
            for i in range(num_months):
                target_date = today + timedelta(days=30*i)
                month_str = target_date.strftime("%Y-%m-01")
                
                availability_data = await RecreationGovService.get_campground_availability(
                    campground_id, month_str
                )
                
                if availability_data:
                    campsites = await RecreationGovService.parse_availability(
                        availability_data, campground_id
                    )
                    
                    for campsite in campsites:
                        site_name = campsite["name"]
                        if site_name not in available_dates:
                            available_dates[site_name] = []
                        
                        # Add available dates
                        for date_str, status in campsite["availability"].items():
                            if status == "available" and date_str not in available_dates[site_name]:
                                available_dates[site_name].append(date_str)
        except Exception as e:
            print(f"Error getting available dates: {e}")
        
        return available_dates
    
    @staticmethod
    async def search_and_get_availability(
        park_name: str,
        campground_name: str
    ) -> Optional[Dict]:
        """
        Search for a campground by name and get its availability.
        
        Returns dict with campground info and availability data.
        """
        try:
            # Try to find the campground
            campground = await RecreationGovService.get_campground_by_name(campground_name)
            
            if campground:
                campground_id = campground.get("facility_id")
                availability = await RecreationGovService.get_campground_availability(
                    campground_id
                )
                
                if availability:
                    campsites = await RecreationGovService.parse_availability(
                        availability, campground_id
                    )
                    
                    return {
                        "park_name": park_name,
                        "campground_name": campground_name,
                        "campground_id": campground_id,
                        "recreation_gov_url": f"https://www.recreation.gov/camping/campgrounds/{campground_id}",
                        "campsites": campsites,
                        "last_updated": datetime.now().isoformat()
                    }
        except Exception as e:
            print(f"Error in search_and_get_availability: {e}")
        
        return None


# For synchronous usage, we can create a wrapper
class RecreationGovSync:
    """Synchronous wrapper for Recreation.gov service."""
    
    @staticmethod
    def get_availability(campground_id: int, month: Optional[str] = None) -> Optional[Dict]:
        """Synchronous wrapper for getting campground availability."""
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                RecreationGovService.get_campground_availability(campground_id, month)
            )
            return result
        finally:
            loop.close()
    
    @staticmethod
    def search_campground(campground_name: str) -> Optional[Dict]:
        """Synchronous wrapper for searching campgrounds."""
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                RecreationGovService.get_campground_by_name(campground_name)
            )
            return result
        finally:
            loop.close()
