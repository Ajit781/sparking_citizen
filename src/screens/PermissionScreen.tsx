import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {PrimaryButton} from '../components/Common';
import {colors} from '../theme/colors';

export default function PermissionScreen({onNext}:{onNext:()=>void}) {
 return <View style={s.root}><Text style={s.title}>Enable Notifications</Text><View style={s.hero}><Text style={s.bell}>●</Text></View><Text style={s.text}>Get updates about parking, bookings, grievances and important city alerts.</Text><View style={{marginTop:30}}><PrimaryButton label="Allow Notifications" onPress={onNext} icon="✓"/></View><Pressable onPress={onNext}><Text style={s.notNow}>Not Now</Text></Pressable></View>;
}
const s=StyleSheet.create({root:{flex:1,padding:20,backgroundColor:colors.background},title:{fontSize:30,fontWeight:'900',color:colors.primaryDark,textAlign:'center',marginTop:40},hero:{width:170,height:170,borderRadius:85,backgroundColor:colors.primarySoft,alignSelf:'center',alignItems:'center',justifyContent:'center',marginVertical:40},bell:{fontSize:80,color:colors.primary},text:{fontSize:17,color:colors.muted,textAlign:'center',lineHeight:25},notNow:{textAlign:'center',color:colors.muted,marginTop:18}});
