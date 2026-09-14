export function recoveryAdvice(error:string){
 if(/credit|balance|billing|payment|402/i.test(error))return {kind:'billing',retry:false,message:'Resolve the account balance or provider billing issue before retrying. Changing the prompt will not fix billing.'};
 if(/policy|safety|sensitive|moderation|flagged|prohibited/i.test(error))return {kind:'policy',retry:false,message:'The provider declined this request. Review the request against its content rules; a provider switch is not a repair.'};
 if(/401|403|credential|api.?key|unauthorized/i.test(error))return {kind:'access',retry:false,message:'Check the provider credential and model permissions before retrying.'};
 if(/unchanged|source image|same image/i.test(error))return {kind:'mismatch',retry:false,message:'Review the source image and make the requested change explicit. Completed steps will be preserved.'};
 if(/timeout|timed out|429|50[234]|unavailable|overload|rate limit/i.test(error))return {kind:'temporary',retry:true,message:'The provider appears temporarily unavailable. A retry may help and may incur another charge; completed steps will be preserved.'};
 return {kind:'unknown',retry:false,message:'The cause is not yet classified. Review the original error before retrying; completed steps will be preserved.'};
}
