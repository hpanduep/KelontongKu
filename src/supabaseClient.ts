import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hyvlqgiueztihijruihp.supabase.co'
const supabaseKey = 'sb_publishable_MEnubMpA5jGsL8tkNEFlmw_7gBqWJCh'

export const supabase = createClient(supabaseUrl, supabaseKey)