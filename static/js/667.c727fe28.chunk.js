"use strict";(self.webpackChunkmy_app=self.webpackChunkmy_app||[]).push([[667],{6667:(e,t,i)=>{i.r(t),i.d(t,{QuickJSAsyncWASMModule:()=>o});var s=i(1416),n=class extends s.o{async evalCodeAsync(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"eval.js",i=arguments.length>2?arguments[2]:void 0,n=void 0===i?1:0,a=(0,s.n)(i),o=0;try{o=await this.memory.newHeapCharPointer(e).consume((e=>this.ffi.QTS_Eval_MaybeAsync(this.ctx.value,e.value.ptr,e.value.strlen,t,n,a)))}catch(r){throw(0,s.a)("QTS_Eval_MaybeAsync threw",r),r}let l=this.ffi.QTS_ResolveException(this.ctx.value,o);return l?(this.ffi.QTS_FreeValuePointer(this.ctx.value,o),{error:this.memory.heapValueHandle(l)}):{value:this.memory.heapValueHandle(o)}}newAsyncifiedFunction(e,t){return this.newFunction(e,t)}},a=class extends s.p{constructor(e){super(e)}newContext(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=(0,s.m)(e.intrinsics),i=new s.g(this.ffi.QTS_NewContext(this.rt.value,t),void 0,(e=>{this.contextMap.delete(e),this.callbacks.deleteContext(e),this.ffi.QTS_FreeContext(e)})),a=new n({module:this.module,ctx:i,ffi:this.ffi,rt:this.rt,ownedLifetimes:[],runtime:this,callbacks:this.callbacks});return this.contextMap.set(i.value,a),a}setModuleLoader(e,t){super.setModuleLoader(e,t)}setMaxStackSize(e){return super.setMaxStackSize(e)}},o=class extends s.t{constructor(e,t){super(e,t),this.ffi=t,this.module=e}newRuntime(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=new s.g(this.ffi.QTS_NewRuntime(),void 0,(e=>{this.callbacks.deleteRuntime(e),this.ffi.QTS_FreeRuntime(e)})),i=new a({module:this.module,ffi:this.ffi,rt:t,callbacks:this.callbacks});return(0,s.r)(i,e),e.moduleLoader&&i.setModuleLoader(e.moduleLoader),i}newContext(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=this.newRuntime(),i=e.ownedLifetimes?e.ownedLifetimes.concat([t]):[t],s=t.newContext({...e,ownedLifetimes:i});return t.context=s,s}evalCode(){throw new s.b("QuickJSWASMModuleAsyncify.evalCode: use evalCodeAsync instead")}evalCodeAsync(e,t){return s.j.withScopeAsync((async i=>{let n=i.manage(this.newContext());(0,s.s)(n.runtime,t);let a=await n.evalCodeAsync(e,"eval.js");if(void 0!==t.memoryLimitBytes&&n.runtime.setMemoryLimit(-1),a.error)throw n.dump(i.manage(a.error));return n.dump(i.manage(a.value))}))}}}}]);
//# sourceMappingURL=667.c727fe28.chunk.js.map