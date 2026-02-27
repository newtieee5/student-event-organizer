// import { User } from '../types';

interface TrafficEstimate {
  distance: string;
  duration: string;
  durationInTraffic?: string;
  trafficIntensity: 'low' | 'moderate' | 'high';
  leaveBy?: string;
}

// export const fetchTrafficData = async (
//   origin: string, 
//   destination: string, 
//   arrivalTime: Date,
//   mode: 'driving' | 'transit' | 'walking' = 'transit'
// ): Promise<TrafficEstimate> => {

// Since we don't have a Google Maps API Key...
export const fetchTrafficData = async (
  _origin: string, // Mock: Unused for now
  _destination: string, // Mock: Unused for now
  arrivalTime: Date,
  mode: string // Mock: 'driving' | 'transit' | 'walking'
): Promise<TrafficEstimate> => {
   
  // SIMULATED TRAFFIC SERVICE
  // Mock logic: 
  // 1. Calculate random distance (5-20km)
  // 2. Base duration is roughly 3 mins per km (driving) or 5 (transit)
  // 3. Add random "traffic" factor based on time of day (rush hour 7-9am, 4-6pm)

  return new Promise((resolve) => {
     setTimeout(() => {
        const hour = arrivalTime.getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
        
        const baseKm = Math.floor(Math.random() * 15) + 5; // 5-20km
        
        let multiplier = 1;
        let traffic: 'low' | 'moderate' | 'high' = 'low';

        if (mode === 'driving') {
             multiplier = 3; // mins per km
             if (isRushHour) {
                 traffic = 'high';
                 multiplier = 5; 
             } else {
                 traffic = Math.random() > 0.7 ? 'moderate' : 'low';
                 multiplier = traffic === 'moderate' ? 4 : 3;
             }
        } else if (mode === 'transit') {
             multiplier = 5; // slower but less traffic impact usually (unless bus)
             if (isRushHour) {
                 traffic = 'high'; // Crowded
                 multiplier = 6;
             }
        } else {
             multiplier = 12; // Walking
             traffic = 'low';
        }

        const totalMinutes = baseKm * multiplier;
        const leaveTime = new Date(arrivalTime.getTime() - totalMinutes * 60000);

        resolve({
            distance: `${baseKm} km`,
            duration: `${Math.floor(totalMinutes)} mins`,
            durationInTraffic: traffic === 'high' ? `${Math.floor(totalMinutes * 1.3)} mins` : undefined,
            trafficIntensity: traffic,
            leaveBy: leaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
     }, 1000); // Simulate API delay
  });
};
