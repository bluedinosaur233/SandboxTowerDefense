// Shared by combat events and renderer so impact flashes and sounds have one clock.
export const HERO_FX_TIMING={strike:.2,rainFirst:.5,rainInterval:.3,rainPulses:6,rainFlight:.36};
export const rainImpactTime=(volley:number)=>HERO_FX_TIMING.rainFirst+volley*HERO_FX_TIMING.rainInterval;
